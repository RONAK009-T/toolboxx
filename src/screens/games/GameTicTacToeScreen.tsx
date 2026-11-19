import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useTheme } from '../../hooks/useTheme';
import { usePreferences } from '../../hooks/usePreferences';
import { useNetwork } from '../../hooks/useNetwork';
import {
  generateRoomCode,
  sendRoomMessage,
  subscribeRoom,
  shareRoomInvite,
  RoomMessage,
} from '../../services/multiplayer/roomService';

interface Props {
  onBack: () => void;
  onGameOver?: (score: number) => void;
}

type CellValue = 'X' | 'O' | null;
type Difficulty = 'easy' | 'medium' | 'hard';
type PlayMode = 'ai' | 'local' | 'online';

export const GameTicTacToeScreen: React.FC<Props> = ({ onBack, onGameOver }) => {
  const { theme } = useTheme();
  const { triggerHaptic, triggerSound } = usePreferences();
  const { isConnected } = useNetwork();

  const [mode, setMode] = useState<PlayMode>('ai');
  const [board, setBoard] = useState<CellValue[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState<boolean>(true);
  const [difficulty, setDifficulty] = useState<Difficulty>('hard');
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [scores, setScores] = useState({ x: 0, o: 0, ties: 0 });

  // Online Multiplayer State
  const [roomCode, setRoomCode] = useState<string>('');
  const [inputRoomCode, setInputRoomCode] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(true);
  const [onlineConnected, setOnlineConnected] = useState<boolean>(false);
  const [mySymbol, setMySymbol] = useState<'X' | 'O'>('X');
  const [myClientId] = useState<string>(() => `player_${Math.random().toString(36).substring(2, 7)}`);

  const winningLines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  const checkWinner = (grid: CellValue[]): { winner: CellValue | 'Tie'; line: number[] } | null => {
    for (const [a, b, c] of winningLines) {
      if (grid[a] && grid[a] === grid[b] && grid[a] === grid[c]) {
        return { winner: grid[a], line: [a, b, c] };
      }
    }
    if (grid.every((c) => c !== null)) {
      return { winner: 'Tie', line: [] as number[] };
    }
    return null;
  };

  const gameResult = checkWinner(board);

  // Minimax algorithm for unbeatable hard mode
  const getBestMoveMinimax = (grid: CellValue[]): number => {
    const emptyIndices = grid
      .map((val, idx) => (val === null ? idx : null))
      .filter((v): v is number => v !== null);

    const checkState = (b: CellValue[]) => {
      for (const [x, y, z] of winningLines) {
        if (b[x] && b[x] === b[y] && b[x] === b[z]) return b[x];
      }
      if (b.every((v) => v !== null)) return 'Tie';
      return null;
    };

    const minimax = (tempBoard: CellValue[], isMaximizing: boolean, depth: number): number => {
      const winner = checkState(tempBoard);
      if (winner === 'O') return 10 - depth;
      if (winner === 'X') return depth - 10;
      if (winner === 'Tie') return 0;

      const avail = tempBoard
        .map((val, idx) => (val === null ? idx : null))
        .filter((v): v is number => v !== null);

      if (isMaximizing) {
        let bestScore = -Infinity;
        for (const idx of avail) {
          tempBoard[idx] = 'O';
          const score = minimax(tempBoard, false, depth + 1);
          tempBoard[idx] = null;
          bestScore = Math.max(score, bestScore);
        }
        return bestScore;
      } else {
        let bestScore = Infinity;
        for (const idx of avail) {
          tempBoard[idx] = 'X';
          const score = minimax(tempBoard, true, depth + 1);
          tempBoard[idx] = null;
          bestScore = Math.min(score, bestScore);
        }
        return bestScore;
      }
    };

    let bestScore = -Infinity;
    let chosenMove = emptyIndices[0];

    for (const idx of emptyIndices) {
      grid[idx] = 'O';
      const score = minimax(grid, false, 0);
      grid[idx] = null;
      if (score > bestScore) {
        bestScore = score;
        chosenMove = idx;
      }
    }

    return chosenMove;
  };

  const triggerComputerMove = (currentBoard: CellValue[]) => {
    const empty = currentBoard
      .map((val, idx) => (val === null ? idx : null))
      .filter((v): v is number => v !== null);

    if (empty.length === 0) {
      setIsAiThinking(false);
      return;
    }

    let move: number;

    if (difficulty === 'easy') {
      move = empty[Math.floor(Math.random() * empty.length)];
    } else if (difficulty === 'medium') {
      let winMove = -1;
      for (const idx of empty) {
        const copy = [...currentBoard];
        copy[idx] = 'O';
        if (checkWinner(copy)?.winner === 'O') {
          winMove = idx;
          break;
        }
      }
      let blockMove = -1;
      if (winMove === -1) {
        for (const idx of empty) {
          const copy = [...currentBoard];
          copy[idx] = 'X';
          if (checkWinner(copy)?.winner === 'X') {
            blockMove = idx;
            break;
          }
        }
      }

      if (winMove !== -1) move = winMove;
      else if (blockMove !== -1) move = blockMove;
      else move = empty[Math.floor(Math.random() * empty.length)];
    } else {
      move = getBestMoveMinimax(currentBoard);
    }

    const next = [...currentBoard];
    next[move] = 'O';
    setBoard(next);
    setIsXNext(true);
    setIsAiThinking(false);

    const res = checkWinner(next);
    if (res && res.winner) handleGameEnd(res.winner);
  };

  const handleCellPress = async (index: number) => {
    if (board[index] || gameResult || isAiThinking) return;

    // Online turn enforcement
    if (mode === 'online') {
      if (!onlineConnected) {
        Alert.alert('Not Connected', 'Please create or join a multiplayer room first.');
        return;
      }
      const expectedTurn = isXNext ? 'X' : 'O';
      if (mySymbol !== expectedTurn) {
        Alert.alert("Opponent's Turn", `Waiting for Player ${expectedTurn} to make their move.`);
        return;
      }
    }

    triggerHaptic('light');
    const newBoard = [...board];
    const currentSymbol = isXNext ? 'X' : 'O';
    newBoard[index] = currentSymbol;
    setBoard(newBoard);

    // Broadcast in online mode
    if (mode === 'online' && roomCode) {
      await sendRoomMessage(roomCode, myClientId, 'move', { index, symbol: currentSymbol });
    }

    const res = checkWinner(newBoard);
    if (res && res.winner) {
      handleGameEnd(res.winner);
      return;
    }

    if (mode === 'ai') {
      setIsXNext(false);
      setIsAiThinking(true);
      setTimeout(() => triggerComputerMove(newBoard), 450);
    } else {
      setIsXNext(!isXNext);
    }
  };

  const handleGameEnd = (winner: string) => {
    if (winner === 'X') {
      triggerSound('win');
      triggerHaptic('success');
      setScores((prev) => ({ ...prev, x: prev.x + 1 }));
      if (onGameOver) onGameOver(scores.x + 1);
    } else if (winner === 'O') {
      triggerSound('gameover');
      triggerHaptic('error');
      setScores((prev) => ({ ...prev, o: prev.o + 1 }));
    } else {
      triggerHaptic('medium');
      setScores((prev) => ({ ...prev, ties: prev.ties + 1 }));
    }
  };

  const resetRound = async (broadcast: boolean = true) => {
    triggerHaptic('light');
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setIsAiThinking(false);

    if (mode === 'online' && roomCode && broadcast) {
      await sendRoomMessage(roomCode, myClientId, 'reset', {});
    }
  };

  // Online Multiplayer Pub/Sub logic
  useEffect(() => {
    if (mode !== 'online' || !onlineConnected || !roomCode) return;

    const unsubscribe = subscribeRoom(roomCode, (msg: RoomMessage) => {
      if (msg.senderId === myClientId) return;

      if (msg.type === 'move' && msg.payload) {
        const { index, symbol } = msg.payload;
        setBoard((prev) => {
          if (prev[index]) return prev;
          const updated = [...prev];
          updated[index] = symbol;

          const res = checkWinner(updated);
          if (res && res.winner) {
            handleGameEnd(res.winner);
          } else {
            setIsXNext(symbol === 'O');
          }
          return updated;
        });
      } else if (msg.type === 'reset') {
        resetRound(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [mode, onlineConnected, roomCode, myClientId]);

  const handleCreateOnlineRoom = () => {
    if (!isConnected) {
      Alert.alert('Internet Required', 'Online multiplayer requires an internet connection.');
      return;
    }
    const code = generateRoomCode();
    setRoomCode(code);
    setIsHost(true);
    setMySymbol('X');
    setOnlineConnected(true);
    resetRound(false);
    triggerHaptic('success');
  };

  const handleJoinOnlineRoom = () => {
    if (!isConnected) {
      Alert.alert('Internet Required', 'Online multiplayer requires an internet connection.');
      return;
    }
    const cleaned = inputRoomCode.trim().toUpperCase();
    if (cleaned.length < 4) {
      Alert.alert('Invalid Code', 'Please enter a valid 6-character room code.');
      return;
    }
    setRoomCode(cleaned);
    setIsHost(false);
    setMySymbol('O');
    setOnlineConnected(true);
    resetRound(false);
    triggerHaptic('success');
  };

  const handleShareInvite = async () => {
    if (!roomCode) return;
    await shareRoomInvite('Tic-Tac-Toe', roomCode, 'tictactoe');
  };

  const boardWidth = Math.min(Dimensions.get('window').width - 48, 320);
  const cellSize = (boardWidth - 24) / 3;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Tic-Tac-Toe"
        subtitle="Unbeatable AI, Pass & Play or Live Online with Friends"
        onBack={onBack}
      />

      {/* Mode Switcher */}
      <View style={[styles.modeBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => {
            triggerHaptic('light');
            setMode('ai');
            resetRound(false);
          }}
          style={[styles.modeBtn, mode === 'ai' && { backgroundColor: theme.primary }]}
        >
          <Text style={[styles.modeBtnText, { color: mode === 'ai' ? '#FFFFFF' : theme.textSecondary }]}>
            vs Computer
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            triggerHaptic('light');
            setMode('local');
            resetRound(false);
          }}
          style={[styles.modeBtn, mode === 'local' && { backgroundColor: theme.primary }]}
        >
          <Text style={[styles.modeBtnText, { color: mode === 'local' ? '#FFFFFF' : theme.textSecondary }]}>
            Pass & Play
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            triggerHaptic('light');
            setMode('online');
            resetRound(false);
          }}
          style={[styles.modeBtn, mode === 'online' && { backgroundColor: theme.primary }]}
        >
          <Text style={[styles.modeBtnText, { color: mode === 'online' ? '#FFFFFF' : theme.textSecondary }]}>
            Online Friend
          </Text>
        </TouchableOpacity>
      </View>

      {/* Difficulty Selector for AI Mode */}
      {mode === 'ai' && (
        <View style={styles.diffRow}>
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <TouchableOpacity
              key={d}
              onPress={() => {
                triggerHaptic('light');
                setDifficulty(d);
                resetRound(false);
              }}
              style={[
                styles.diffBtn,
                difficulty === d && { backgroundColor: theme.primaryGlow, borderColor: theme.primary },
                { borderColor: theme.border },
              ]}
            >
              <Text
                style={[
                  styles.diffText,
                  { color: difficulty === d ? theme.primary : theme.textMuted },
                ]}
              >
                {d === 'hard' ? 'UNBEATABLE' : d.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Online Room Panel */}
      {mode === 'online' && (
        <View style={[styles.onlinePanel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {!isConnected ? (
            <View style={styles.offlineBox}>
              <Ionicons name="wifi-outline" size={18} color="#DC2626" />
              <Text style={styles.offlineText}>Connect to internet to play with friends online.</Text>
            </View>
          ) : !onlineConnected ? (
            <View style={styles.roomCreateJoinRow}>
              <TouchableOpacity
                onPress={handleCreateOnlineRoom}
                style={[styles.smallActionBtn, { backgroundColor: theme.primary }]}
              >
                <Text style={styles.smallActionBtnText}>Create Room</Text>
              </TouchableOpacity>

              <View style={styles.joinInputWrap}>
                <TextInput
                  style={[styles.miniInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  placeholder="ROOM CODE"
                  placeholderTextColor={theme.textMuted}
                  value={inputRoomCode}
                  onChangeText={setInputRoomCode}
                  autoCapitalize="characters"
                  maxLength={6}
                />
                <TouchableOpacity onPress={handleJoinOnlineRoom} style={[styles.miniJoinBtn, { backgroundColor: theme.primary }]}>
                  <Text style={styles.smallActionBtnText}>Join</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.roomActiveRow}>
              <View>
                <Text style={[styles.roomCodeLabel, { color: theme.textMuted }]}>ROOM: {roomCode}</Text>
                <Text style={[styles.symbolLabel, { color: theme.primary }]}>YOU ARE: PLAYER {mySymbol}</Text>
              </View>

              <TouchableOpacity onPress={handleShareInvite} style={[styles.sharePill, { backgroundColor: theme.primaryGlow }]}>
                <Ionicons name="share-outline" size={14} color={theme.primary} />
                <Text style={[styles.sharePillText, { color: theme.primary }]}>Share Invite</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Scoreboard */}
      <View style={styles.scoreRow}>
        <View style={[styles.scoreCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.scoreName, { color: '#2563EB' }]}>Player X</Text>
          <Text style={[styles.scoreValue, { color: theme.text }]}>{scores.x}</Text>
        </View>

        <View style={[styles.scoreCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.scoreName, { color: theme.textMuted }]}>Ties</Text>
          <Text style={[styles.scoreValue, { color: theme.text }]}>{scores.ties}</Text>
        </View>

        <View style={[styles.scoreCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.scoreName, { color: '#DC2626' }]}>
            {mode === 'ai' ? 'AI Bot (O)' : 'Player O'}
          </Text>
          <Text style={[styles.scoreValue, { color: theme.text }]}>{scores.o}</Text>
        </View>
      </View>

      {/* Current Turn / Result Banner */}
      <View style={[styles.turnCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {gameResult ? (
          <Text
            style={[
              styles.turnText,
              { color: gameResult.winner === 'Tie' ? theme.textSecondary : '#16A34A' },
            ]}
          >
            {gameResult.winner === 'Tie' ? 'Round Draw! Well Played.' : `Winner: Player ${gameResult.winner}!`}
          </Text>
        ) : (
          <Text style={[styles.turnText, { color: theme.text }]}>
            {isAiThinking
              ? 'Computer is thinking...'
              : `Current Turn: Player ${isXNext ? 'X' : 'O'}`}
          </Text>
        )}
      </View>

      {/* 3x3 Grid */}
      <View style={[styles.boardWrap, { width: boardWidth, height: boardWidth }]}>
        <View style={[styles.grid, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {board.map((cell, idx) => {
            const isWinningCell = gameResult?.line.includes(idx);
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => handleCellPress(idx)}
                activeOpacity={0.8}
                disabled={cell !== null || !!gameResult || isAiThinking}
                style={[
                  styles.cell,
                  {
                    width: cellSize,
                    height: cellSize,
                    borderColor: theme.border,
                    backgroundColor: isWinningCell ? 'rgba(22, 163, 74, 0.2)' : theme.surface,
                  },
                ]}
              >
                {cell === 'X' && <Text style={[styles.cellText, { color: '#2563EB' }]}>X</Text>}
                {cell === 'O' && <Text style={[styles.cellText, { color: '#DC2626' }]}>O</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Reset Action Button */}
      <TouchableOpacity
        onPress={() => resetRound(true)}
        style={[styles.resetBtn, { backgroundColor: theme.primary }]}
      >
        <Ionicons name="refresh-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
        <Text style={styles.resetBtnText}>New Round</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  modeBar: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
    marginHorizontal: 16,
    marginTop: 8,
    width: '92%',
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  diffRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  diffBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  diffText: {
    fontSize: 11,
    fontWeight: '700',
  },
  onlinePanel: {
    width: '92%',
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginTop: 10,
  },
  offlineBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offlineText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '600',
  },
  roomCreateJoinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  smallActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  smallActionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  joinInputWrap: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  miniInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  miniJoinBtn: {
    paddingHorizontal: 10,
    borderRadius: 6,
    justifyContent: 'center',
  },
  roomActiveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomCodeLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  symbolLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  sharePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  sharePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    width: '92%',
  },
  scoreCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  scoreName: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  turnCard: {
    width: '92%',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  turnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  boardWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
  },
  cellText: {
    fontSize: 42,
    fontWeight: '900',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  resetBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
