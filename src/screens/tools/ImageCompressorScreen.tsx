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
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useTheme } from '../../hooks/useTheme';
import { usePreferences } from '../../hooks/usePreferences';
import { shareImageFile, saveFileToDocuments } from '../../services/sharing/sharingService';

interface Props {
  onBack: () => void;
}

type QualityLevel = 'low' | 'medium' | 'high' | 'custom';

export const ImageCompressorScreen: React.FC<Props> = ({ onBack }) => {
  const { theme } = useTheme();
  const { triggerHaptic } = usePreferences();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [qualityLevel, setQualityLevel] = useState<QualityLevel>('medium');
  const [customQuality, setCustomQuality] = useState<number>(0.5);

  const [compressedUri, setCompressedUri] = useState<string | null>(null);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedPath, setSavedPath] = useState<string | null>(null);

  const formatBytes = (bytes: number | null): string => {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getEffectiveQuality = (): number => {
    switch (qualityLevel) {
      case 'low':
        return 0.3;
      case 'medium':
        return 0.55;
      case 'high':
        return 0.8;
      case 'custom':
        return Math.max(0.1, Math.min(0.99, customQuality));
    }
  };

  const pickImage = async () => {
    triggerHaptic('light');
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        setCompressedUri(null);
        setCompressedSize(null);
        setSavedPath(null);

        // Copy to cache directory to ensure a safe local file path and accurate file size
        const cachePath = `${FileSystem.cacheDirectory}original_${Date.now()}.jpg`;
        await FileSystem.copyAsync({
          from: asset.uri,
          to: cachePath,
        });

        setImageUri(cachePath);

        const info = await FileSystem.getInfoAsync(cachePath);
        if (info.exists && 'size' in info && typeof info.size === 'number') {
          setOriginalSize(info.size);
        } else if (asset.fileSize) {
          setOriginalSize(asset.fileSize);
        }
      }
    } catch {
      Alert.alert('Gallery Error', 'Could not access the device photo library.');
    }
  };

  const compressImage = async () => {
    if (!imageUri) return;
    triggerHaptic('medium');
    setLoading(true);

    try {
      const q = getEffectiveQuality();
      const filename = `ToolBoxX_compressed_${Date.now()}.jpg`;

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [],
        {
          compress: q,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      // Copy result to designated cache file
      const destination = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.copyAsync({
        from: result.uri,
        to: destination,
      });

      setCompressedUri(destination);

      const info = await FileSystem.getInfoAsync(destination);
      if (info.exists && 'size' in info && typeof info.size === 'number') {
        setCompressedSize(info.size);
      }

      triggerHaptic('success');
    } catch {
      Alert.alert('Compression Error', 'Failed to compress the selected image file.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!compressedUri) return;
    triggerHaptic('light');
    await shareImageFile(compressedUri, {
      mimeType: 'image/jpeg',
      dialogTitle: 'Share Compressed Image',
    });
  };

  const handleSave = async () => {
    if (!compressedUri) return;
    triggerHaptic('success');
    const filename = `Compressed_${Date.now()}.jpg`;
    const dest = await saveFileToDocuments(compressedUri, filename);
    if (dest) {
      setSavedPath(filename);
      Alert.alert('Saved Successfully', `File saved to device storage:\n${filename}`);
    } else {
      Alert.alert('Save Error', 'Could not save file to device documents.');
    }
  };

  const reductionPercent =
    originalSize && compressedSize && originalSize > compressedSize
      ? (((originalSize - compressedSize) / originalSize) * 100).toFixed(1)
      : '0.0';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Image Compressor"
        onBack={onBack}
        subtitle="Reduce image file size with real compression"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Step 1: Input Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>1. Select Image</Text>

          {imageUri ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
              <View style={styles.previewMetaRow}>
                <Text style={[styles.previewMetaText, { color: theme.textSecondary }]}>
                  Original Size: <Text style={{ fontWeight: '700', color: theme.text }}>{formatBytes(originalSize)}</Text>
                </Text>
                <TouchableOpacity onPress={pickImage} style={[styles.changeBtn, { borderColor: theme.border }]}>
                  <Text style={[styles.changeBtnText, { color: theme.primary }]}>Change Photo</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={pickImage} activeOpacity={0.8} style={[styles.uploadBox, { borderColor: theme.border }]}>
              <Ionicons name="cloud-upload-outline" size={36} color={theme.primary} />
              <Text style={[styles.uploadTitle, { color: theme.text }]}>Choose an Image</Text>
              <Text style={[styles.uploadSub, { color: theme.textMuted }]}>Supports JPG, PNG, WEBP (Offline)</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Step 2: Quality Options */}
        {imageUri && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>2. Select Compression Quality</Text>

            <View style={styles.qualityRow}>
              {(['low', 'medium', 'high', 'custom'] as QualityLevel[]).map((lvl) => {
                const isSel = qualityLevel === lvl;
                return (
                  <TouchableOpacity
                    key={lvl}
                    onPress={() => {
                      triggerHaptic('light');
                      setQualityLevel(lvl);
                    }}
                    style={[
                      styles.qualityBtn,
                      {
                        backgroundColor: isSel ? theme.primary : theme.backgroundSecondary,
                        borderColor: isSel ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text style={[styles.qualityBtnText, { color: isSel ? '#FFF' : theme.textSecondary }]}>
                      {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {qualityLevel === 'custom' && (
              <View style={styles.customStepperRow}>
                <Text style={[styles.stepperLabel, { color: theme.textSecondary }]}>
                  Custom Ratio: {Math.round(customQuality * 100)}%
                </Text>
                <View style={styles.stepperBtns}>
                  <TouchableOpacity
                    onPress={() => {
                      triggerHaptic('light');
                      setCustomQuality((q) => Math.max(0.1, parseFloat((q - 0.1).toFixed(2))));
                    }}
                    style={[styles.stepBtn, { borderColor: theme.border }]}
                  >
                    <Ionicons name="remove" size={18} color={theme.text} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      triggerHaptic('light');
                      setCustomQuality((q) => Math.min(0.9, parseFloat((q + 0.1).toFixed(2))));
                    }}
                    style={[styles.stepBtn, { borderColor: theme.border }]}
                  >
                    <Ionicons name="add" size={18} color={theme.text} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Primary Action Button */}
            <TouchableOpacity
              disabled={loading}
              activeOpacity={0.8}
              onPress={compressImage}
              style={[styles.primaryActionBtn, { backgroundColor: theme.primary }]}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.primaryActionBtnText}>Compress Image</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Step 3: Result Card */}
        {compressedUri && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>3. Compression Result</Text>

            {/* Exact Before / After Stats */}
            <View style={[styles.statsTable, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}>
              <View style={styles.statColumn}>
                <Text style={[styles.statHeader, { color: theme.textMuted }]}>Original</Text>
                <Text style={[styles.statValue, { color: theme.text }]}>{formatBytes(originalSize)}</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statColumn}>
                <Text style={[styles.statHeader, { color: theme.textMuted }]}>Compressed</Text>
                <Text style={[styles.statValue, { color: theme.primary }]}>{formatBytes(compressedSize)}</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statColumn}>
                <Text style={[styles.statHeader, { color: theme.textMuted }]}>Reduced</Text>
                <Text style={[styles.statValue, { color: theme.success }]}>{reductionPercent}%</Text>
              </View>
            </View>

            {/* Compressed Image Preview */}
            <View style={styles.resultPreviewBox}>
              <Image source={{ uri: compressedUri }} style={styles.resultImage} resizeMode="contain" />
            </View>

            {/* Save & Share Actions */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                onPress={handleSave}
                style={[styles.secondaryActionBtn, { borderColor: theme.border }]}
              >
                <Ionicons name="download-outline" size={18} color={theme.text} />
                <Text style={[styles.secondaryActionBtnText, { color: theme.text }]}>
                  {savedPath ? 'Saved' : 'Save Image'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleShare}
                style={[styles.shareActionBtn, { backgroundColor: theme.primary }]}
              >
                <Ionicons name="share-social-outline" size={18} color="#FFF" />
                <Text style={styles.shareActionBtnText}>Share Image</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 12,
  },
  uploadBox: {
    height: 160,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  uploadTitle: { fontSize: 15, fontWeight: '700' },
  uploadSub: { fontSize: 12 },
  previewContainer: { gap: 10 },
  previewImage: { width: '100%', height: 180, borderRadius: 10 },
  previewMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewMetaText: { fontSize: 13 },
  changeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  changeBtnText: { fontSize: 12, fontWeight: '700' },
  qualityRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  qualityBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  qualityBtnText: { fontSize: 13, fontWeight: '700' },
  customStepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  stepperLabel: { fontSize: 13, fontWeight: '600' },
  stepperBtns: { flexDirection: 'row', gap: 8 },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryActionBtn: {
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryActionBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  statsTable: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 12,
    marginBottom: 14,
  },
  statColumn: { flex: 1, alignItems: 'center' },
  statHeader: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '800' },
  statDivider: { width: 1, height: '70%', alignSelf: 'center' },
  resultPreviewBox: {
    height: 180,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 16,
  },
  resultImage: { width: '100%', height: '100%' },
  actionButtonsRow: { flexDirection: 'row', gap: 10 },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryActionBtnText: { fontSize: 14, fontWeight: '700' },
  shareActionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  shareActionBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
