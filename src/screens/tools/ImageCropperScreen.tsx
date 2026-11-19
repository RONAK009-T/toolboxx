import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useTheme } from '../../hooks/useTheme';
import { usePreferences } from '../../hooks/usePreferences';

interface Props {
  onBack: () => void;
}

type AspectRatioPreset = 'free' | '1:1' | '4:3' | '16:9';

export const ImageCropperScreen: React.FC<Props> = ({ onBack }) => {
  const { theme } = useTheme();
  const { triggerHaptic } = usePreferences();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [origWidth, setOrigWidth] = useState(0);
  const [origHeight, setOrigHeight] = useState(0);
  const [preset, setPreset] = useState<AspectRatioPreset>('1:1');
  const [croppedUri, setCroppedUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    triggerHaptic('light');
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        setImageUri(asset.uri);
        setOrigWidth(asset.width);
        setOrigHeight(asset.height);
        setCroppedUri(null);
      }
    } catch {
      Alert.alert('Error', 'Unable to pick photo.');
    }
  };

  const cropImage = async () => {
    if (!imageUri || origWidth === 0 || origHeight === 0) return;
    triggerHaptic('medium');
    setLoading(true);

    try {
      let cropWidth = origWidth;
      let cropHeight = origHeight;
      let originX = 0;
      let originY = 0;

      if (preset === '1:1') {
        const side = Math.min(origWidth, origHeight);
        cropWidth = side;
        cropHeight = side;
        originX = Math.round((origWidth - side) / 2);
        originY = Math.round((origHeight - side) / 2);
      } else if (preset === '4:3') {
        const targetRatio = 4 / 3;
        if (origWidth / origHeight > targetRatio) {
          cropHeight = origHeight;
          cropWidth = Math.round(origHeight * targetRatio);
          originX = Math.round((origWidth - cropWidth) / 2);
        } else {
          cropWidth = origWidth;
          cropHeight = Math.round(origWidth / targetRatio);
          originY = Math.round((origHeight - cropHeight) / 2);
        }
      } else if (preset === '16:9') {
        const targetRatio = 16 / 9;
        if (origWidth / origHeight > targetRatio) {
          cropHeight = origHeight;
          cropWidth = Math.round(origHeight * targetRatio);
          originX = Math.round((origWidth - cropWidth) / 2);
        } else {
          cropWidth = origWidth;
          cropHeight = Math.round(origWidth / targetRatio);
          originY = Math.round((origHeight - cropHeight) / 2);
        }
      }

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ crop: { originX, originY, width: cropWidth, height: cropHeight } }],
        { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG }
      );

      setCroppedUri(result.uri);
      triggerHaptic('success');
    } catch {
      Alert.alert('Crop Error', 'Failed to crop image.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!croppedUri) return;
    triggerHaptic('light');
    try {
      await Sharing.shareAsync(croppedUri);
    } catch {
      // ignore
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Image Cropper"
        onBack={onBack}
        subtitle="Crop to 1:1, 4:3, 16:9 & standard ratios"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={pickImage}
          style={[styles.uploadBox, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="crop-outline" size={40} color={theme.primary} />
              <Text style={[styles.title, { color: theme.text }]}>Choose Photo to Crop</Text>
              <Text style={[styles.sub, { color: theme.textMuted }]}>Offline crop presets</Text>
            </View>
          )}
        </TouchableOpacity>

        {imageUri && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Select Aspect Ratio</Text>
            <View style={styles.presetsRow}>
              {(['1:1', '4:3', '16:9', 'free'] as AspectRatioPreset[]).map((p) => {
                const isSel = preset === p;
                return (
                  <TouchableOpacity
                    key={p}
                    onPress={() => {
                      triggerHaptic('light');
                      setPreset(p);
                    }}
                    style={[
                      styles.presetBtn,
                      {
                        backgroundColor: isSel ? theme.primary : theme.background,
                        borderColor: isSel ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text style={[styles.presetText, { color: isSel ? '#FFF' : theme.text }]}>
                      {p === 'free' ? 'Original' : p}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              disabled={loading}
              activeOpacity={0.8}
              onPress={cropImage}
              style={[styles.actionBtn, { backgroundColor: theme.primary }]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.actionBtnText}>Apply Crop</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {croppedUri && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 12 }]}>Cropped Result</Text>
            <Image source={{ uri: croppedUri }} style={{ width: '100%', height: 200, borderRadius: 12, marginBottom: 14 }} resizeMode="contain" />
            <TouchableOpacity onPress={handleShare} style={[styles.actionBtn, { backgroundColor: theme.primary }]}>
              <Ionicons name="share-social-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnText}>Share / Save Photo</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  uploadBox: {
    height: 220,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  preview: { width: '100%', height: '100%' },
  empty: { alignItems: 'center', gap: 6 },
  title: { fontSize: 16, fontWeight: '700' },
  sub: { fontSize: 12 },
  card: { borderRadius: 18, borderWidth: 1, padding: 18, marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  presetsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  presetBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  presetText: { fontSize: 13, fontWeight: '700' },
  actionBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
