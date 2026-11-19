import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
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

type PresetOption = '25%' | '50%' | '75%' | '100%' | 'Custom';

export const ImageResizerScreen: React.FC<Props> = ({ onBack }) => {
  const { theme } = useTheme();
  const { triggerHaptic } = usePreferences();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [origWidth, setOrigWidth] = useState<number>(0);
  const [origHeight, setOrigHeight] = useState<number>(0);
  const [origSizeFormatted, setOrigSizeFormatted] = useState<string>('');

  const [targetWidth, setTargetWidth] = useState<string>('');
  const [targetHeight, setTargetHeight] = useState<string>('');
  const [maintainAspect, setMaintainAspect] = useState<boolean>(true);
  const [activePreset, setActivePreset] = useState<PresetOption>('50%');

  const [resizedUri, setResizedUri] = useState<string | null>(null);
  const [resizedWidth, setResizedWidth] = useState<number>(0);
  const [resizedHeight, setResizedHeight] = useState<number>(0);
  const [resizedSizeFormatted, setResizedSizeFormatted] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
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
        
        // Cache copy for reliable filesystem access
        const cacheName = `orig_resize_${Date.now()}.${asset.uri.split('.').pop() || 'jpg'}`;
        const cachePath = `${FileSystem.cacheDirectory}${cacheName}`;
        await FileSystem.copyAsync({ from: asset.uri, to: cachePath });

        const info = await FileSystem.getInfoAsync(cachePath);
        const bytes = info.exists && 'size' in info && typeof info.size === 'number' ? info.size : 0;
        setOrigSizeFormatted(formatBytes(bytes));

        setImageUri(cachePath);
        setOrigWidth(asset.width);
        setOrigHeight(asset.height);

        // Default to 50%
        const w50 = Math.round(asset.width * 0.5);
        const h50 = Math.round(asset.height * 0.5);
        setTargetWidth(w50.toString());
        setTargetHeight(h50.toString());
        setActivePreset('50%');
        setResizedUri(null);
        setSavedSuccess(false);
      }
    } catch (err: any) {
      Alert.alert('Selection Error', err?.message || 'Could not access device photos.');
    }
  };

  const applyPreset = (preset: PresetOption) => {
    triggerHaptic('light');
    setActivePreset(preset);
    if (!origWidth || !origHeight) return;

    let ratio = 1;
    if (preset === '25%') ratio = 0.25;
    else if (preset === '50%') ratio = 0.5;
    else if (preset === '75%') ratio = 0.75;
    else if (preset === '100%') ratio = 1;
    else return;

    setTargetWidth(Math.round(origWidth * ratio).toString());
    setTargetHeight(Math.round(origHeight * ratio).toString());
  };

  const handleWidthChange = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    setTargetWidth(cleaned);
    setActivePreset('Custom');

    if (maintainAspect && origWidth > 0 && origHeight > 0) {
      const parsedW = parseInt(cleaned, 10);
      if (!isNaN(parsedW) && parsedW > 0) {
        const calculatedH = Math.round((parsedW / origWidth) * origHeight);
        setTargetHeight(calculatedH.toString());
      } else if (cleaned === '') {
        setTargetHeight('');
      }
    }
  };

  const handleHeightChange = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    setTargetHeight(cleaned);
    setActivePreset('Custom');

    if (maintainAspect && origWidth > 0 && origHeight > 0) {
      const parsedH = parseInt(cleaned, 10);
      if (!isNaN(parsedH) && parsedH > 0) {
        const calculatedW = Math.round((parsedH / origHeight) * origWidth);
        setTargetWidth(calculatedW.toString());
      } else if (cleaned === '') {
        setTargetWidth('');
      }
    }
  };

  const handleResize = async () => {
    if (!imageUri) return;

    const w = parseInt(targetWidth, 10);
    const h = parseInt(targetHeight, 10);

    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
      Alert.alert('Invalid Dimensions', 'Width and height must be positive numbers greater than 0.');
      return;
    }

    if (w > 12000 || h > 12000) {
      Alert.alert('Dimension Too Large', 'Maximum dimension supported is 12,000 pixels.');
      return;
    }

    triggerHaptic('medium');
    setLoading(true);
    setSavedSuccess(false);

    try {
      const format = imageUri.toLowerCase().endsWith('.png')
        ? ImageManipulator.SaveFormat.PNG
        : ImageManipulator.SaveFormat.JPEG;

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: w, height: h } }],
        { compress: 0.92, format }
      );

      // Verify file and size
      const outInfo = await FileSystem.getInfoAsync(result.uri);
      const outBytes = outInfo.exists && 'size' in outInfo && typeof outInfo.size === 'number' ? outInfo.size : 0;

      setResizedUri(result.uri);
      setResizedWidth(w);
      setResizedHeight(h);
      setResizedSizeFormatted(formatBytes(outBytes));
      triggerHaptic('success');
    } catch (err: any) {
      Alert.alert('Resize Failed', err?.message || 'Could not resize the image.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToDevice = async () => {
    if (!resizedUri) return;
    triggerHaptic('light');

    const ext = resizedUri.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
    const filename = `ToolBoxX_Resized_${Date.now()}.${ext}`;
    const savedPath = await saveFileToDocuments(resizedUri, filename);

    if (savedPath) {
      setSavedSuccess(true);
      triggerHaptic('success');
      Alert.alert('Saved to Documents', `Image successfully saved as ${filename}`);
    } else {
      Alert.alert('Save Failed', 'Could not save the file to device storage.');
    }
  };

  const handleShare = async () => {
    if (!resizedUri) return;
    triggerHaptic('light');
    await shareImageFile(resizedUri, { dialogTitle: 'Share Resized Image' });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Image Resizer"
        subtitle="Pixel-accurate dimension control & aspect lock"
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Upload / Source Preview */}
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
                <Ionicons name="resize-outline" size={32} color={theme.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Select Image to Resize</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                Supports JPG, PNG & WEBP • Works 100% Offline
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {imageUri && (
          <>
            {/* Dimension Stats Header */}
            <View style={[styles.statBanner, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.statCol}>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>ORIGINAL SIZE</Text>
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {origWidth} × {origHeight} px
                </Text>
                {origSizeFormatted ? (
                  <Text style={[styles.statSub, { color: theme.textMuted }]}>{origSizeFormatted}</Text>
                ) : null}
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statCol}>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>TARGET SIZE</Text>
                <Text style={[styles.statValue, { color: theme.primary }]}>
                  {targetWidth || '0'} × {targetHeight || '0'} px
                </Text>
                <Text style={[styles.statSub, { color: theme.textSecondary }]}>
                  {activePreset}
                </Text>
              </View>
            </View>

            {/* Presets Row */}
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>DIMENSION PRESETS</Text>
              <View style={styles.presetsGrid}>
                {(['25%', '50%', '75%', '100%'] as PresetOption[]).map((p) => {
                  const isSelected = activePreset === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      onPress={() => applyPreset(p)}
                      activeOpacity={0.8}
                      style={[
                        styles.presetChip,
                        {
                          backgroundColor: isSelected ? theme.primary : theme.background,
                          borderColor: isSelected ? theme.primary : theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          { color: isSelected ? '#FFFFFF' : theme.text },
                        ]}
                      >
                        {p === '100%' ? 'Original (100%)' : p}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Dimension Inputs & Aspect Lock */}
              <View style={styles.dimensionRow}>
                <View style={styles.dimensionField}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>WIDTH (PX)</Text>
                  <TextInput
                    style={[
                      styles.inputBox,
                      { backgroundColor: theme.background, color: theme.text, borderColor: theme.border },
                    ]}
                    value={targetWidth}
                    onChangeText={handleWidthChange}
                    keyboardType="numeric"
                    placeholder="W"
                    placeholderTextColor={theme.textMuted}
                    maxLength={5}
                  />
                </View>

                {/* Aspect Lock Toggle */}
                <TouchableOpacity
                  onPress={() => {
                    triggerHaptic('light');
                    setMaintainAspect(!maintainAspect);
                  }}
                  activeOpacity={0.8}
                  style={[
                    styles.aspectBtn,
                    {
                      backgroundColor: maintainAspect ? theme.primaryGlow : theme.background,
                      borderColor: maintainAspect ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={maintainAspect ? 'link' : 'unlink-outline'}
                    size={20}
                    color={maintainAspect ? theme.primary : theme.textMuted}
                  />
                  <Text
                    style={[
                      styles.aspectText,
                      { color: maintainAspect ? theme.primary : theme.textMuted },
                    ]}
                  >
                    {maintainAspect ? 'Locked' : 'Free'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.dimensionField}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>HEIGHT (PX)</Text>
                  <TextInput
                    style={[
                      styles.inputBox,
                      { backgroundColor: theme.background, color: theme.text, borderColor: theme.border },
                    ]}
                    value={targetHeight}
                    onChangeText={handleHeightChange}
                    keyboardType="numeric"
                    placeholder="H"
                    placeholderTextColor={theme.textMuted}
                    maxLength={5}
                  />
                </View>
              </View>

              {/* Action Button */}
              <TouchableOpacity
                disabled={loading}
                activeOpacity={0.85}
                onPress={handleResize}
                style={[styles.primaryActionBtn, { backgroundColor: theme.primary }]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="expand-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryActionBtnText}>Resize Image Now</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Resized Result Card */}
            {resizedUri && (
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.resultHeader}>
                  <View style={[styles.checkCircle, { backgroundColor: '#16A34A' }]}>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.resultTitle, { color: theme.text }]}>Image Resized Successfully</Text>
                    <Text style={[styles.resultSub, { color: theme.textSecondary }]}>
                      Output: {resizedWidth} × {resizedHeight} px • {resizedSizeFormatted}
                    </Text>
                  </View>
                </View>

                <View style={[styles.resultPreviewBox, { borderColor: theme.border }]}>
                  <Image source={{ uri: resizedUri }} style={styles.resultImage} resizeMode="contain" />
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
  statBanner: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  statSub: {
    fontSize: 11,
    marginTop: 2,
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
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetChip: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  dimensionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 18,
  },
  dimensionField: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputBox: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  aspectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    gap: 2,
  },
  aspectText: {
    fontSize: 10,
    fontWeight: '700',
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
