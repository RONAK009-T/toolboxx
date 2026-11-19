import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useTheme } from '../../hooks/useTheme';
import { usePreferences } from '../../hooks/usePreferences';
import { getHighScores, saveHighScore } from '../../storage/storage';
import { RewardedModal } from '../../ads/RewardedModal';

interface Props {
  isOnline: boolean;
  onBack: () => void;
  onGameOver?: (score: number) => void;
}

interface Obstacle {
  x: number;
  topHeight: number;
  bottomHeight: number;
  passed: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAME_HEIGHT = 420;
const GAME_WIDTH = Math.min(SCREEN_WIDTH - 32, 340);
const GRAVITY = 0.58;
const JUMP_FORCE = -8.8;
const GAP_SIZE = 125;
const OBSTACLE_WIDTH = 46;
const DRONE_SIZE = 30;
const DRONE_X = 64;

export const GameAeroDashScreen: React.FC<Props> = ({ isOnline, onBack, onGameOver }) => {
  const { theme } = useTheme();
  const { triggerHaptic, triggerSound } = usePreferences();

  const [droneRenderY, setDroneRenderY] = useState<number>(GAME_HEIGHT / 2);
  const [droneRenderAngle, setDroneRenderAngle] = useState<number>(0);
  const [renderObstacles, setRenderObstacles] = useState<Obstacle[]>([]);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isDead, setIsDead] = useState<boolean>(false);
  const [showRewarded, setShowRewarded] = useState<boolean>(false);
  const [hasUsedExtraLife, setHasUsedExtraLife] = useState<boolean>(false);

  // Mutable state ref strictly avoids React closure staleness and touch input lag
  const physicsRef = useRef({
    droneY: GAME_HEIGHT / 2,
    velocity: 0,
    obstacles: [] as Obstacle[],
    score: 0,
    isPlaying: false,
    isDead: false,
    highScore: 0,
  });

  const animFrameId = useRef<number | null>(null);

  useEffect(() => {
    loadHighScore();
    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, []);

  const loadHighScore = async () => {
    const scores = await getHighScores();
    const hs = scores['game_aero_dash'] || 0;
    setHighScore(hs);
    physicsRef.current.highScore = hs;
  };

  const createGate = (posX: number): Obstacle => {
    const minHeight = 45;
    const maxHeight = GAME_HEIGHT - GAP_SIZE - minHeight;
    const topHeight = Math.floor(Math.random() * (maxHeight - minHeight)) + minHeight;
    const bottomHeight = GAME_HEIGHT - topHeight - GAP_SIZE;
    return {
      x: posX,
      topHeight,
      bottomHeight,
      passed: false,
    };
  };

  const startGame = () => {
    triggerHaptic('medium');
    const initialGates = [createGate(GAME_WIDTH + 60), createGate(GAME_WIDTH + 240)];

    physicsRef.current = {
      droneY: GAME_HEIGHT / 2,
      velocity: 0,
      obstacles: initialGates,
      score: 0,
      isPlaying: true,
      isDead: false,
      highScore: physicsRef.current.highScore,
    };

    setDroneRenderY(GAME_HEIGHT / 2);
    setDroneRenderAngle(0);
    setRenderObstacles(initialGates);
    setScore(0);
    setIsPlaying(true);
    setIsDead(false);
    setHasUsedExtraLife(false);

    if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    animFrameId.current = requestAnimationFrame(gameLoop);
  };

  const handleFlap = () => {
    if (physicsRef.current.isDead) return;
    if (!physicsRef.current.isPlaying) {
      startGame();
      return;
    }

    // Instant touch response without waiting for React re-render cycle
    triggerHaptic('light');
    physicsRef.current.velocity = JUMP_FORCE;
  };

  const handleCrash = () => {
    physicsRef.current.isDead = true;
    physicsRef.current.isPlaying = false;
    setIsDead(true);
    setIsPlaying(false);

    triggerSound('gameover');
    triggerHaptic('error');

    if (animFrameId.current) cancelAnimationFrame(animFrameId.current);

    saveHighScore('game_aero_dash', physicsRef.current.score);
    if (onGameOver) onGameOver(physicsRef.current.score);
  };

  const gameLoop = () => {
    const state = physicsRef.current;
    if (!state.isPlaying || state.isDead) return;

    // Apply acceleration & velocity
    state.velocity += GRAVITY;
    state.droneY += state.velocity;

    // Floor and Ceiling bounds
    if (state.droneY <= 0 || state.droneY >= GAME_HEIGHT - DRONE_SIZE) {
      handleCrash();
      return;
    }

    // Move obstacles and test collision
    const nextGates: Obstacle[] = [];
    const droneBox = {
      left: DRONE_X - 12,
      right: DRONE_X + 12,
      top: state.droneY + 4,
      bottom: state.droneY + DRONE_SIZE - 4,
    };

    for (let i = 0; i < state.obstacles.length; i++) {
      const gate = { ...state.obstacles[i] };
      gate.x -= 3.0; // Steady smooth horizontal velocity

      // Check collision
      if (droneBox.right > gate.x && droneBox.left < gate.x + OBSTACLE_WIDTH) {
        if (droneBox.top < gate.topHeight || droneBox.bottom > GAME_HEIGHT - gate.bottomHeight) {
          handleCrash();
          return;
        }
      }

      // Check score increment
      if (!gate.passed && gate.x + OBSTACLE_WIDTH < DRONE_X) {
        gate.passed = true;
        state.score += 1;
        setScore(state.score);
        triggerHaptic('light');
        triggerSound('score');

        if (state.score > state.highScore) {
          state.highScore = state.score;
          setHighScore(state.score);
          saveHighScore('game_aero_dash', state.score);
        }
      }

      if (gate.x + OBSTACLE_WIDTH > 0) {
        nextGates.push(gate);
      }
    }

    // Spawn new gates on right
    if (nextGates.length < 2) {
      const lastGateX = nextGates[nextGates.length - 1]?.x || GAME_WIDTH;
      nextGates.push(createGate(lastGateX + 180));
    }

    state.obstacles = nextGates;

    // Update render visual state
    setDroneRenderY(state.droneY);
    setDroneRenderAngle(Math.min(40, Math.max(-28, state.velocity * 3.8)));
    setRenderObstacles(nextGates);

    animFrameId.current = requestAnimationFrame(gameLoop);
  };

  const handleClaimExtraLife = () => {
    setShowRewarded(false);
    setHasUsedExtraLife(true);

    physicsRef.current.droneY = GAME_HEIGHT / 2;
    physicsRef.current.velocity = -4.5;
    physicsRef.current.isDead = false;
    physicsRef.current.isPlaying = true;
    // Push gates away from center for safe revival
    physicsRef.current.obstacles = physicsRef.current.obstacles.map((g) => ({
      ...g,
      x: g.x + 120,
    }));

    setDroneRenderY(GAME_HEIGHT / 2);
    setIsDead(false);
    setIsPlaying(true);

    if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    animFrameId.current = requestAnimationFrame(gameLoop);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Aero Dash"
        onBack={onBack}
        subtitle="Zero-lag flight physics & obstacle avoidance"
      />

      {/* Score Header */}
      <View style={styles.scoreRow}>
        <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.statTitle, { color: theme.textMuted }]}>SCORE</Text>
          <Text style={[styles.statVal, { color: theme.text }]}>{score}</Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.statTitle, { color: theme.textMuted }]}>ALL-TIME BEST</Text>
          <Text style={[styles.statVal, { color: theme.primary }]}>{highScore}</Text>
        </View>
      </View>

      {/* Game Field Canvas */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleFlap}
        style={[
          styles.gameCanvas,
          {
            width: GAME_WIDTH,
            height: GAME_HEIGHT,
            backgroundColor: theme.isDark ? '#0F172A' : '#1E293B',
            borderColor: theme.border,
          },
        ]}
      >
        {/* Drone Craft */}
        <View
          style={[
            styles.drone,
            {
              top: droneRenderY,
              left: DRONE_X - DRONE_SIZE / 2,
              transform: [{ rotate: `${droneRenderAngle}deg` }],
            },
          ]}
        >
          <Ionicons name="airplane" size={26} color="#38BDF8" />
        </View>

        {/* Energy Gates (Top & Bottom) */}
        {renderObstacles.map((gate, idx) => (
          <React.Fragment key={`gate-${idx}`}>
            {/* Top Barrier */}
            <View
              style={[
                styles.gate,
                {
                  left: gate.x,
                  top: 0,
                  width: OBSTACLE_WIDTH,
                  height: gate.topHeight,
                  backgroundColor: '#16A34A',
                  borderBottomLeftRadius: 6,
                  borderBottomRightRadius: 6,
                },
              ]}
            />
            {/* Bottom Barrier */}
            <View
              style={[
                styles.gate,
                {
                  left: gate.x,
                  bottom: 0,
                  width: OBSTACLE_WIDTH,
                  height: gate.bottomHeight,
                  backgroundColor: '#16A34A',
                  borderTopLeftRadius: 6,
                  borderTopRightRadius: 6,
                },
              ]}
            />
          </React.Fragment>
        ))}

        {/* Start Overlay */}
        {!isPlaying && !isDead && (
          <View style={styles.overlay}>
            <View style={styles.playCircle}>
              <Ionicons name="navigate-circle-outline" size={54} color="#38BDF8" />
            </View>
            <Text style={styles.overlayTitle}>Tap Anywhere to Fly</Text>
            <Text style={styles.overlaySub}>Navigate between green energy columns</Text>
          </View>
        )}

        {/* Crash / Game Over Overlay */}
        {isDead && (
          <View style={styles.overlay}>
            <Text style={styles.deadTitle}>Drone Down!</Text>
            <Text style={styles.deadScore}>Final Score: {score}</Text>

            <TouchableOpacity onPress={startGame} activeOpacity={0.85} style={[styles.deadBtn, { backgroundColor: theme.primary }]}>
              <Text style={styles.deadBtnText}>Play Again</Text>
            </TouchableOpacity>

            {!hasUsedExtraLife && (
              <TouchableOpacity
                onPress={() => setShowRewarded(true)}
                activeOpacity={0.85}
                style={[styles.rewardedBtn, { backgroundColor: '#F59E0B' }]}
              >
                <Ionicons name="heart" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.rewardedBtnText}>Extra Life (Watch Ad)</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>

      <RewardedModal
        visible={showRewarded}
        onClose={() => setShowRewarded(false)}
        onRewarded={handleClaimExtraLife}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 14,
    width: GAME_WIDTH,
  },
  statBox: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  statTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statVal: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  gameCanvas: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  drone: {
    position: 'absolute',
    width: DRONE_SIZE,
    height: DRONE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  gate: {
    position: 'absolute',
    zIndex: 5,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 17, 32, 0.82)',
    zIndex: 20,
    padding: 24,
  },
  playCircle: {
    marginBottom: 12,
  },
  overlayTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  overlaySub: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
  },
  deadTitle: {
    color: '#EF4444',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 6,
  },
  deadScore: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 20,
  },
  deadBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
    width: '75%',
    alignItems: 'center',
  },
  deadBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  rewardedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 8,
    width: '75%',
  },
  rewardedBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
