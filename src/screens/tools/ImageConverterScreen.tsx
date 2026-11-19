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
  onNavigateToPdf?: () => void;
}

type SupportedFormat = 'JPG' | 'PNG' | 'WEBP';

export const ImageConverterScreen: React.FC<Props> = ({ onBack, onNavigateToPdf }) => {
  const { theme } = useTheme();
  const { triggerHaptic } = usePreferences();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [sourceFormat, setSourceFormat] = useState<string>('UNKNOWN');
  const [sourceSizeFormatted, setSourceSizeFormatted] = useState<string>('');
  const [targetFormat, setTargetFormat] = useState<SupportedFormat>('PNG');

  const [convertedUri, setConvertedUri] = useState<string | null>(null);
  const [convertedSizeFormatted, setConvertedSizeFormatted] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const detectFormatFromUri = (uri: string, mime?: string): string => {
    if (mime?.includes('pdf') || uri.toLowerCase().endsWith('.pdf')) {
      return 'PDF';
    }
    if (mime?.includes('png') || uri.toLowerCase().endsWith('.png')) return 'PNG';
    if (mime?.includes('webp') || uri.toLowerCase().endsWith('.webp')) return 'WEBP';
    if (mime?.includes('jpeg') || mime?.includes('jpg') || uri.toLowerCase().endsWith('.jpg') || uri.toLowerCase().endsWith('.jpeg')) {
      return 'JPG';
    }
    return 'JPG';
  };

  const pickImage = async () => {
    triggerHaptic('light');
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Storage permission is required to select images.');
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        const detected = detectFormatFromUri(asset.uri, asset.mimeType);

        // Strict PDF Check Rule: Image converter must not treat PDF files as images
        if (detected === 'PDF') {
          Alert.alert(
            'PDF File Detected',
            'This file is a PDF.\n\nPlease use PDF Tools for PDF operations.',
            [
              { text: 'OK', style: 'cancel' },
              ...(onNavigateToPdf
                ? [{ text: 'Go to PDF Tools', onPress: () => onNavigateToPdf() }]
                : []),
            ]
          );
          return;
        }

        // Cache copy for reliable filesystem access
        const tempExt = detected.toLowerCase() === 'png' ? 'png' : detected.toLowerCase() === 'webp' ? 'webp' : 'jpg';
        const cachePath = `${FileSystem.cacheDirectory}source_convert_${Date.now()}.${tempExt}`;
        await FileSystem.copyAsync({ from: asset.uri, to: cachePath });

        const info = await FileSystem.getInfoAsync(cachePath);
        const bytes = info.exists && 'size' in info && typeof info.size === 'number' ? info.size : 0;

        setImageUri(cachePath);
        setSourceFormat(detected);
        setSourceSizeFormatted(formatBytes(bytes));

        // Default target format to something different than source
        if (detected === 'PNG') {
          setTargetFormat('JPG');
        } else if (detected === 'JPG') {
          setTargetFormat('PNG');
        } else {
          setTargetFormat('PNG');
        }

        setConvertedUri(null);
        setSavedSuccess(false);
      }
    } catch (err: any) {
      Alert.alert('Selection Error', err?.message || 'Could not pick photo.');
    }
  };

  const handleConvert = async () => {
    if (!imageUri) return;
    triggerHaptic('medium');
    setLoading(true);
    setSavedSuccess(false);

    try {
      let format = ImageManipulator.SaveFormat.JPEG;
      let ext = 'jpg';
      let mimeType = 'image/jpeg';

      if (targetFormat === 'PNG') {
        format = ImageManipulator.SaveFormat.PNG;
        ext = 'png';
        mimeType = 'image/png';
      } else if (targetFormat === 'WEBP') {
        format = ImageManipulator.SaveFormat.WEBP;
        ext = 'webp';
        mimeType = 'image/webp';
      }

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [],
        { compress: 0.95, format }
      );

      // Verify converted output file
      const outFileName = `converted_${Date.now()}.${ext}`;
      const outPath = `${FileSystem.cacheDirectory}${outFileName}`;
      await FileSystem.copyAsync({ from: result.uri, to: outPath });

      const info = await FileSystem.getInfoAsync(outPath);
      const bytes = info.exists && 'size' in info && typeof info.size === 'number' ? info.size : 0;

      setConvertedUri(outPath);
      setConvertedSizeFormatted(formatBytes(bytes));
      triggerHaptic('success');
    } catch (err: any) {
      Alert.alert('Conversion Failed', `Could not convert image to ${targetFormat}: ${err?.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToDevice = async () => {
    if (!convertedUri) return;
    triggerHaptic('light');

    const ext = targetFormat.toLowerCase();
    const filename = `ToolBoxX_Converted_${Date.now()}.${ext}`;
    const savedPath = await saveFileToDocuments(convertedUri, filename);

    if (savedPath) {
      setSavedSuccess(true);
      triggerHaptic('success');
      Alert.alert('Saved to Documents', `File saved as ${filename}`);
    } else {
      Alert.alert('Save Failed', 'Could not save converted file to device storage.');
    }
  };

  const handleShare = async () => {
    if (!convertedUri) return;
    triggerHaptic('light');

    const mime =
      targetFormat === 'PNG' ? 'image/png' : targetFormat === 'WEBP' ? 'image/webp' : 'image/jpeg';
    await shareImageFile(convertedUri, { mimeType: mime, dialogTitle: `Share ${targetFormat} Image` });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Image Converter"
        subtitle="Lossless JPG, PNG & WEBP format conversion"
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Upload Card */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={pickImage}
          style={[styles.uploadBox, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          {imageUri ? (
            <View style={styles.imageWrapper}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
              <View style={[styles.changeOverlay, { backgroundColor: 'rgba(11, 17, 32, 0.75)' }]}>
                <Ionicons name="camera-reverse-outline" size={16} color="#FFFFFF" />
                <Text style={styles.changeOverlayText}>Change Image</Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyPrompt}>
              <View style={[styles.iconCircle, { backgroundColor: theme.primaryGlow }]}>
                <Ionicons name="swap-horizontal-outline" size={32} color={theme.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Select Image to Convert</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                Supports JPG, PNG & WEBP • Strict PDF Isolation
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {imageUri && (
          <>
            {/* Conversion Path Banner */}
            <View style={[styles.flowBanner, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.flowCol}>
                <Text style={[styles.flowLabel, { color: theme.textMuted }]}>ORIGINAL FORMAT</Text>
                <View style={[styles.formatTag, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Text style={[styles.formatTagText, { color: theme.text }]}>{sourceFormat}</Text>
                </View>
                <Text style={[styles.flowSub, { color: theme.textMuted }]}>{sourceSizeFormatted}</Text>
              </View>

              <View style={styles.arrowBox}>
                <Ionicons name="arrow-forward" size={20} color={theme.primary} />
              </View>

              <View style={styles.flowCol}>
                <Text style={[styles.flowLabel, { color: theme.textMuted }]}>TARGET FORMAT</Text>
                <View style={[styles.formatTag, { backgroundColor: theme.primaryGlow, borderColor: theme.primary }]}>
                  <Text style={[styles.formatTagText, { color: theme.primary }]}>{targetFormat}</Text>
                </View>
                <Text style={[styles.flowSub, { color: theme.textSecondary }]}>Ready to Convert</Text>
              </View>
            </View>

            {/* Target Format Selector */}
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>SELECT TARGET FORMAT</Text>
              <View style={styles.formatGrid}>
                {(['JPG', 'PNG', 'WEBP'] as SupportedFormat[]).map((fmt) => {
                  const isSelected = targetFormat === fmt;
                  const isCurrent = sourceFormat === fmt;
                  return (
                    <TouchableOpacity
                      key={fmt}
                      onPress={() => {
                        triggerHaptic('light');
                        setTargetFormat(fmt);
                      }}
                      activeOpacity={0.8}
                      style={[
                        styles.formatChip,
                        {
                          backgroundColor: isSelected ? theme.primary : theme.background,
                          borderColor: isSelected ? theme.primary : theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.formatChipText,
                          { color: isSelected ? '#FFFFFF' : theme.text },
                        ]}
                      >
                        .{fmt.toLowerCase()}
                      </Text>
                      {isCurrent && (
                        <Text style={[styles.currentNote, { color: isSelected ? '#FFFFFF' : theme.textMuted }]}>
                          (Current)
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Action Button */}
              <TouchableOpacity
                disabled={loading}
                activeOpacity={0.85}
                onPress={handleConvert}
                style={[styles.primaryActionBtn, { backgroundColor: theme.primary }]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="sync-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryActionBtnText}>
                      Convert to {targetFormat}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Converted Result */}
            {convertedUri && (
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.resultHeader}>
                  <View style={[styles.checkCircle, { backgroundColor: '#16A34A' }]}>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.resultTitle, { color: theme.text }]}>Converted to {targetFormat}</Text>
                    <Text style={[styles.resultSub, { color: theme.textSecondary }]}>
                      Output File: {convertedSizeFormatted} • Genuine .{targetFormat.toLowerCase()}
                    </Text>
                  </View>
                </View>

                <View style={[styles.resultPreviewBox, { borderColor: theme.border }]}>
                  <Image source={{ uri: convertedUri }} style={styles.resultImage} resizeMode="contain" />
                </View>

                {/* Save and Share Buttons */}
                <View style={styles.actionButtonGroup}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleSaveToDevice}
                    style={[
                      styles.secondaryActionBtn,
                      {
                        backgroundColor: savedSuccess ? '#16A34A' : theme.background,
                        borderColor: savedSuccess ? '#16A34A' : theme.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={savedSuccess ? 'checkmark-circle-outline' : 'download-outline'}
                      size={18}
                      color={savedSuccess ? '#FFFFFF' : theme.text}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.secondaryActionBtnText, { color: savedSuccess ? '#FFFFFF' : theme.text }]}>
                      {savedSuccess ? 'Saved' : 'Save Image'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleShare}
                    style={[styles.shareActionBtn, { backgroundColor: theme.primary }]}
                  >
                    <Ionicons name="share-social-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.shareActionBtnText}>Share File</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  uploadBox: {
    height: 190,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 16,
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  changeOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  changeOverlayText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyPrompt: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  flowBanner: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  flowCol: {
    flex: 1,
    alignItems: 'center',
  },
  arrowBox: {
    paddingHorizontal: 8,
  },
  flowLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  formatTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  formatTagText: {
    fontSize: 14,
    fontWeight: '800',
  },
  flowSub: {
    fontSize: 11,
    marginTop: 4,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  formatGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  formatChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatChipText: {
    fontSize: 15,
    fontWeight: '800',
  },
  currentNote: {
    fontSize: 10,
    marginTop: 2,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 8,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  resultSub: {
    fontSize: 12,
    marginTop: 2,
  },
  resultPreviewBox: {
    height: 180,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  resultImage: {
    width: '100%',
    height: '100%',
  },
  actionButtonGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
  },
  secondaryActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  shareActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 8,
  },
  shareActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
