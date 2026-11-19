import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useTheme } from '../../hooks/useTheme';
import { usePreferences } from '../../hooks/usePreferences';
import { shareImageFile, saveFileToDocuments } from '../../services/sharing/sharingService';

interface Props {
  onBack: () => void;
}

type QRType = 'text' | 'url' | 'wifi' | 'phone' | 'email' | 'contact';

export const QRGeneratorScreen: React.FC<Props> = ({ onBack }) => {
  const { theme } = useTheme();
  const { triggerHaptic } = usePreferences();

  const qrSvgRef = useRef<any>(null);
  const [qrType, setQrType] = useState<QRType>('text');

  // Input states
  const [textVal, setTextVal] = useState('ToolBox X - Production Utility Suite');
  const [urlVal, setUrlVal] = useState('https://github.com');
  const [phoneVal, setPhoneVal] = useState('+1234567890');
  const [emailVal, setEmailVal] = useState('support@toolboxx.app');
  const [wifiSsid, setWifiSsid] = useState('MyOffice_Network');
  const [wifiPass, setWifiPass] = useState('SecurityKey2026');
  const [contactName, setContactName] = useState('Antigravity Engineer');
  const [contactPhone, setContactPhone] = useState('+18005550199');

  const [copied, setCopied] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const qrPayload = useMemo(() => {
    switch (qrType) {
      case 'url':
        return urlVal.startsWith('http://') || urlVal.startsWith('https://')
          ? urlVal
          : `https://${urlVal}`;
      case 'phone':
        return `tel:${phoneVal}`;
      case 'email':
        return `mailto:${emailVal}`;
      case 'wifi':
        return `WIFI:S:${wifiSsid};T:WPA;P:${wifiPass};;`;
      case 'contact':
        return `BEGIN:VCARD\nVERSION:3.0\nFN:${contactName}\nTEL:${contactPhone}\nEND:VCARD`;
      case 'text':
      default:
        return textVal || 'ToolBox X';
    }
  }, [qrType, textVal, urlVal, phoneVal, emailVal, wifiSsid, wifiPass, contactName, contactPhone]);

  const qrTypes: { id: QRType; label: string; icon: string }[] = [
    { id: 'text', label: 'Plain Text', icon: 'text-outline' },
    { id: 'url', label: 'URL / Link', icon: 'globe-outline' },
    { id: 'wifi', label: 'Wi-Fi Network', icon: 'wifi-outline' },
    { id: 'phone', label: 'Phone Call', icon: 'call-outline' },
    { id: 'email', label: 'Email', icon: 'mail-outline' },
    { id: 'contact', label: 'vCard Contact', icon: 'person-outline' },
  ];

  /**
   * Captures the actual QR SVG canvas to a physical PNG file: toolbox_qr_2026.png.
   * This completely prevents the bug where text or contact names were shared.
   */
  const captureQrCodeImage = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!qrSvgRef.current) {
        reject(new Error('QR renderer is not initialized.'));
        return;
      }

      qrSvgRef.current.toDataURL(async (data: string) => {
        try {
          const filePath = `${FileSystem.cacheDirectory}toolbox_qr_2026.png`;
          await FileSystem.writeAsStringAsync(filePath, data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          resolve(filePath);
        } catch (err) {
          reject(err);
        }
      });
    });
  };

  const handleCopyText = async () => {
    triggerHaptic('success');
    await Clipboard.setStringAsync(qrPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveQrImage = async () => {
    triggerHaptic('light');
    setIsExporting(true);
    setSavedSuccess(false);

    try {
      const pngPath = await captureQrCodeImage();
      const savedPath = await saveFileToDocuments(pngPath, 'toolbox_qr_2026.png');

      if (savedPath) {
        setSavedSuccess(true);
        triggerHaptic('success');
        Alert.alert('Saved to Documents', 'QR code image successfully saved as toolbox_qr_2026.png');
      } else {
        Alert.alert('Save Failed', 'Could not save QR image to storage.');
      }
    } catch (err: any) {
      Alert.alert('Export Error', err?.message || 'Could not export QR code image.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareQrImage = async () => {
    triggerHaptic('light');
    setIsExporting(true);

    try {
      const pngPath = await captureQrCodeImage();
      await shareImageFile(pngPath, {
        mimeType: 'image/png',
        dialogTitle: 'Share QR Code Image',
      });
    } catch (err: any) {
      Alert.alert('Share Error', err?.message || 'Could not share QR image.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="QR Code Generator"
        subtitle="Offline vector QR generator & genuine PNG export"
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* QR Type Selector Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
          {qrTypes.map((t) => {
            const isSel = qrType === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => {
                  triggerHaptic('light');
                  setQrType(t.id);
                  setSavedSuccess(false);
                }}
                activeOpacity={0.8}
                style={[
                  styles.pillBtn,
                  {
                    backgroundColor: isSel ? theme.primary : theme.surface,
                    borderColor: isSel ? theme.primary : theme.border,
                  },
                ]}
              >
                <Ionicons
                  name={t.icon as any}
                  size={14}
                  color={isSel ? '#FFFFFF' : theme.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.pillText, { color: isSel ? '#FFFFFF' : theme.textSecondary }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Input Configuration Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>PAYLOAD CONFIGURATION</Text>

          {qrType === 'text' && (
            <View>
              <Text style={[styles.label, { color: theme.textSecondary }]}>TEXT CONTENT</Text>
              <TextInput
                multiline
                numberOfLines={3}
                value={textVal}
                onChangeText={setTextVal}
                placeholder="Enter any text content..."
                placeholderTextColor={theme.textMuted}
                style={[
                  styles.textArea,
                  { backgroundColor: theme.background, color: theme.text, borderColor: theme.border },
                ]}
              />
            </View>
          )}

          {qrType === 'url' && (
            <View>
              <Text style={[styles.label, { color: theme.textSecondary }]}>WEBSITE URL</Text>
              <TextInput
                value={urlVal}
                onChangeText={setUrlVal}
                placeholder="https://example.com"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
                style={[
                  styles.input,
                  { backgroundColor: theme.background, color: theme.text, borderColor: theme.border },
                ]}
              />
            </View>
          )}

          {qrType === 'wifi' && (
            <View style={{ gap: 12 }}>
              <View>
                <Text style={[styles.label, { color: theme.textSecondary }]}>NETWORK SSID (NAME)</Text>
                <TextInput
                  value={wifiSsid}
                  onChangeText={setWifiSsid}
                  placeholder="Wi-Fi SSID"
                  placeholderTextColor={theme.textMuted}
                  style={[
                    styles.input,
                    { backgroundColor: theme.background, color: theme.text, borderColor: theme.border },
                  ]}
                />
              </View>
              <View>
                <Text style={[styles.label, { color: theme.textSecondary }]}>SECURITY PASSWORD</Text>
                <TextInput
                  value={wifiPass}
                  onChangeText={setWifiPass}
                  placeholder="WPA/WPA2 Password"
                  placeholderTextColor={theme.textMuted}
                  secureTextEntry
                  style={[
                    styles.input,
                    { backgroundColor: theme.background, color: theme.text, borderColor: theme.border },
                  ]}
                />
              </View>
            </View>
          )}

          {qrType === 'phone' && (
            <View>
              <Text style={[styles.label, { color: theme.textSecondary }]}>PHONE NUMBER</Text>
              <TextInput
                keyboardType="phone-pad"
                value={phoneVal}
                onChangeText={setPhoneVal}
                placeholder="+1234567890"
                placeholderTextColor={theme.textMuted}
                style={[
                  styles.input,
                  { backgroundColor: theme.background, color: theme.text, borderColor: theme.border },
                ]}
              />
            </View>
          )}

          {qrType === 'email' && (
            <View>
              <Text style={[styles.label, { color: theme.textSecondary }]}>EMAIL RECIPIENT</Text>
              <TextInput
                keyboardType="email-address"
                value={emailVal}
                onChangeText={setEmailVal}
                placeholder="support@domain.com"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
                style={[
                  styles.input,
                  { backgroundColor: theme.background, color: theme.text, borderColor: theme.border },
                ]}
              />
            </View>
          )}

          {qrType === 'contact' && (
            <View style={{ gap: 12 }}>
              <View>
                <Text style={[styles.label, { color: theme.textSecondary }]}>CONTACT FULL NAME</Text>
                <TextInput
                  value={contactName}
                  onChangeText={setContactName}
                  placeholder="Alex Smith"
                  placeholderTextColor={theme.textMuted}
                  style={[
                    styles.input,
                    { backgroundColor: theme.background, color: theme.text, borderColor: theme.border },
                  ]}
                />
              </View>
              <View>
                <Text style={[styles.label, { color: theme.textSecondary }]}>CONTACT PHONE NUMBER</Text>
                <TextInput
                  keyboardType="phone-pad"
                  value={contactPhone}
                  onChangeText={setContactPhone}
                  placeholder="+1234567890"
                  placeholderTextColor={theme.textMuted}
                  style={[
                    styles.input,
                    { backgroundColor: theme.background, color: theme.text, borderColor: theme.border },
                  ]}
                />
              </View>
            </View>
          )}
        </View>

        {/* QR Code Graphic Frame */}
        <View style={[styles.qrContainer, { backgroundColor: '#FFFFFF', borderColor: theme.border }]}>
          <QRCode
            value={qrPayload || 'ToolBoxX'}
            size={210}
            color="#0B1120"
            backgroundColor="#FFFFFF"
            getRef={(c) => (qrSvgRef.current = c)}
          />
          <View style={styles.qrBadge}>
            <Text style={styles.qrBadgeText}>PNG 210×210 • OFFLINE VECTOR</Text>
          </View>
        </View>

        {/* Export & Actions Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ACTIONS & SHARING</Text>

          {/* Real Image Export Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              disabled={isExporting}
              activeOpacity={0.8}
              onPress={handleSaveQrImage}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: savedSuccess ? '#16A34A' : theme.background,
                  borderColor: savedSuccess ? '#16A34A' : theme.border,
                },
              ]}
            >
              <Ionicons
                name={savedSuccess ? 'checkmark-circle' : 'download-outline'}
                size={18}
                color={savedSuccess ? '#FFFFFF' : theme.text}
              />
              <Text style={[styles.actionBtnText, { color: savedSuccess ? '#FFFFFF' : theme.text }]}>
                {savedSuccess ? 'Saved' : 'Save QR Image'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={isExporting}
              activeOpacity={0.8}
              onPress={handleShareQrImage}
              style={[styles.actionBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}
            >
              {isExporting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
                  <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Share QR Image</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Copy Plain Payload Option */}
          <TouchableOpacity
            onPress={handleCopyText}
            style={[styles.copyPayloadBtn, { borderColor: theme.border }]}
          >
            <Ionicons
              name={copied ? 'checkmark' : 'copy-outline'}
              size={15}
              color={copied ? '#16A34A' : theme.textMuted}
            />
            <Text
              style={[
                styles.copyPayloadText,
                { color: copied ? '#16A34A' : theme.textMuted },
              ]}
            >
              {copied ? 'Payload Copied to Clipboard' : 'Copy Text Data to Clipboard'}
            </Text>
          </TouchableOpacity>
        </View>
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
  pillRow: {
    marginBottom: 16,
  },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
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
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    minHeight: 75,
    textAlignVertical: 'top',
  },
  qrContainer: {
    padding: 24,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  qrBadge: {
    marginTop: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  qrBadgeText: {
    color: '#4B5563',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  copyPayloadBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  copyPayloadText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
