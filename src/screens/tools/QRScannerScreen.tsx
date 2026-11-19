import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  TextInput,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useTheme } from '../../hooks/useTheme';
import { usePreferences } from '../../hooks/usePreferences';

interface Props {
  onBack: () => void;
}

export const QRScannerScreen: React.FC<Props> = ({ onBack }) => {
  const { theme } = useTheme();
  const { triggerHaptic } = usePreferences();

  const [permission, requestPermission] = useCameraPermissions();
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [scannedType, setScannedType] = useState<string>('QR Code');
  const [testInput, setTestInput] = useState('');
  const [copied, setCopied] = useState(false);

  const handleBarcodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (!scannedData) {
      triggerHaptic('success');
      setScannedData(data);
      setScannedType(type || 'Barcode');
    }
  };

  const handleCopy = async () => {
    if (!scannedData) return;
    triggerHaptic('success');
    await Clipboard.setStringAsync(scannedData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenLink = async () => {
    if (!scannedData) return;
    triggerHaptic('light');
    const isUrl = scannedData.startsWith('http://') || scannedData.startsWith('https://');
    if (isUrl) {
      try {
        await Linking.openURL(scannedData);
      } catch {
        Alert.alert('Unable to open URL', scannedData);
      }
    } else {
      Alert.alert('Not a Web Link', 'The scanned content is raw text, not a web URL.');
    }
  };

  const resetScan = () => {
    triggerHaptic('light');
    setScannedData(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="QR & Barcode Scanner"
        onBack={onBack}
        subtitle="Offline optical barcode decoder"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Camera View Area */}
        <View style={[styles.cameraContainer, { backgroundColor: '#000', borderColor: theme.border }]}>
          {permission?.granted ? (
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: [
                  'qr',
                  'ean13',
                  'ean8',
                  'upc_a',
                  'code128',
                  'code39',
                ],
              }}
              onBarcodeScanned={scannedData ? undefined : handleBarcodeScanned}
            >
              <View style={styles.reticleOverlay}>
                <View style={[styles.reticleBox, { borderColor: theme.primary }]} />
                <Text style={styles.reticleHint}>Align QR or Barcode within box</Text>
              </View>
            </CameraView>
          ) : (
            <View style={styles.permissionBox}>
              <Ionicons name="camera-outline" size={44} color={theme.textMuted} />
              <Text style={[styles.permTitle, { color: '#FFF' }]}>Camera Access Needed</Text>
              <Text style={[styles.permDesc, { color: theme.textSecondary }]}>
                ToolBox X decodes barcodes locally on your device without sending images anywhere.
              </Text>
              <TouchableOpacity
                onPress={requestPermission}
                style={[styles.permBtn, { backgroundColor: theme.primary }]}
              >
                <Text style={styles.permBtnText}>Grant Camera Permission</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Scanned Result Card */}
        {scannedData ? (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.resultHeader}>
              <View style={[styles.typeBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Text style={[styles.typeBadgeText, { color: theme.primary }]}>{scannedType}</Text>
              </View>
              <TouchableOpacity onPress={resetScan} style={styles.scanAgainBtn}>
                <Ionicons name="refresh" size={16} color={theme.textMuted} />
                <Text style={{ fontSize: 12, color: theme.textMuted, marginLeft: 4 }}>Scan Again</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.scannedContent, { color: theme.text }]}>{scannedData}</Text>

            <View style={styles.actionsRow}>
              <TouchableOpacity onPress={handleCopy} style={[styles.actionBtn, { borderColor: theme.border }]}>
                <Ionicons
                  name={copied ? 'checkmark-circle' : 'copy-outline'}
                  size={16}
                  color={copied ? '#10B981' : theme.text}
                />
                <Text style={[styles.actionBtnText, { color: copied ? '#10B981' : theme.text }]}>
                  {copied ? 'Copied' : 'Copy'}
                </Text>
              </TouchableOpacity>

              {(scannedData.startsWith('http://') || scannedData.startsWith('https://')) && (
                <TouchableOpacity
                  onPress={handleOpenLink}
                  style={[styles.actionBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}
                >
                  <Ionicons name="open-outline" size={16} color="#FFF" />
                  <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Open Link</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          /* Simulator for emulators / tests without camera */
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.simTitle, { color: theme.textSecondary }]}>
              Simulator / Manual Test Input
            </Text>
            <View style={styles.simInputRow}>
              <TextInput
                value={testInput}
                onChangeText={setTestInput}
                placeholder="Enter sample QR text or barcode..."
                placeholderTextColor={theme.textMuted}
                style={[styles.simInput, { color: theme.text, borderColor: theme.border }]}
              />
              <TouchableOpacity
                onPress={() => {
                  if (testInput.trim()) {
                    handleBarcodeScanned({ type: 'Manual Input', data: testInput.trim() });
                  }
                }}
                style={[styles.simBtn, { backgroundColor: theme.primary }]}
              >
                <Text style={styles.simBtnText}>Decode</Text>
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
  cameraContainer: {
    height: 280,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: { width: '100%', height: '100%' },
  reticleOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  reticleBox: {
    width: 180,
    height: 180,
    borderWidth: 2.5,
    borderRadius: 16,
    marginBottom: 12,
  },
  reticleHint: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  permissionBox: {
    alignItems: 'center',
    padding: 20,
    gap: 10,
  },
  permTitle: { fontSize: 16, fontWeight: '700' },
  permDesc: { fontSize: 12, textAlign: 'center', lineHeight: 16 },
  permBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 6,
  },
  permBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  card: { borderRadius: 18, borderWidth: 1, padding: 18, marginBottom: 16 },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  scanAgainBtn: { flexDirection: 'row', alignItems: 'center' },
  scannedContent: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    marginVertical: 12,
  },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
  simTitle: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  simInputRow: { flexDirection: 'row', gap: 8 },
  simInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  simBtn: {
    paddingHorizontal: 14,
    borderRadius: 10,
    justifyContent: 'center',
  },
  simBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
});
