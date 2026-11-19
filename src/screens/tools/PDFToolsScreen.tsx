import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useTheme } from '../../hooks/useTheme';
import { usePreferences } from '../../hooks/usePreferences';
import { useNetwork } from '../../hooks/useNetwork';
import { sharePdfFile, saveFileToDocuments } from '../../services/sharing/sharingService';
import {
  generateRoomCode,
  sendRoomMessage,
  subscribeRoom,
  shareRoomInvite,
  RoomMessage,
} from '../../services/multiplayer/roomService';

interface Props {
  onBack: () => void;
}

interface ImageItem {
  id: string;
  uri: string;
  width?: number;
  height?: number;
}

export const PDFToolsScreen: React.FC<Props> = ({ onBack }) => {
  const { theme } = useTheme();
  const { triggerHaptic } = usePreferences();
  const { isConnected } = useNetwork();

  const [activeTab, setActiveTab] = useState<'create' | 'collab'>('create');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [pdfSizeFormatted, setPdfSizeFormatted] = useState<string>('');
  const [pdfFilename, setPdfFilename] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Online Collab State
  const [roomCode, setRoomCode] = useState<string>('');
  const [inputRoomCode, setInputRoomCode] = useState<string>('');
  const [collabConnected, setCollabConnected] = useState<boolean>(false);
  const [collabNotes, setCollabNotes] = useState<string>('');
  const [peerMessages, setPeerMessages] = useState<string[]>([]);
  const [myClientId] = useState<string>(() => `user_${Math.random().toString(36).substring(2, 6)}`);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const pickImages = async () => {
    triggerHaptic('light');
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Storage permission is required to select images.');
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.9,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        // Cache copied assets for guaranteed reliable base64 reading
        const newItems: ImageItem[] = [];
        for (const asset of res.assets) {
          const ext = asset.uri.split('.').pop() || 'jpg';
          const cachePath = `${FileSystem.cacheDirectory}pdf_page_${Date.now()}_${Math.random().toString(36).substring(2, 5)}.${ext}`;
          await FileSystem.copyAsync({ from: asset.uri, to: cachePath });
          newItems.push({
            id: `${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            uri: cachePath,
            width: asset.width,
            height: asset.height,
          });
        }

        setImages((prev) => [...prev, ...newItems]);
        setPdfUri(null);
        setSavedSuccess(false);
      }
    } catch (err: any) {
      Alert.alert('Selection Error', err?.message || 'Could not pick photos.');
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    triggerHaptic('light');
    setImages((prev) => {
      const updated = [...prev];
      const temp = updated[index - 1];
      updated[index - 1] = updated[index];
      updated[index] = temp;
      return updated;
    });
    setPdfUri(null);
  };

  const moveDown = (index: number) => {
    if (index === images.length - 1) return;
    triggerHaptic('light');
    setImages((prev) => {
      const updated = [...prev];
      const temp = updated[index + 1];
      updated[index + 1] = updated[index];
      updated[index] = temp;
      return updated;
    });
    setPdfUri(null);
  };

  const removeImage = (index: number) => {
    triggerHaptic('light');
    setImages((prev) => prev.filter((_, idx) => idx !== index));
    setPdfUri(null);
    setSavedSuccess(false);
  };

  const handleGeneratePDF = async () => {
    if (images.length === 0) {
      Alert.alert('No Images', 'Please select at least one image to create a PDF.');
      return;
    }

    triggerHaptic('medium');
    setLoading(true);
    setSavedSuccess(false);

    try {
      // Convert images to base64 for standalone embedded HTML rendering
      const renderedPages = await Promise.all(
        images.map(async (img, idx) => {
          let base64 = '';
          try {
            base64 = await FileSystem.readAsStringAsync(img.uri, {
              encoding: 'base64',
            });
          } catch {
            // fallback
          }

          const imgSrc = base64 ? `data:image/jpeg;base64,${base64}` : img.uri;
          return `
            <div class="page">
              <div class="header">Page ${idx + 1} of ${images.length} • ToolBox X Document</div>
              <div class="image-wrapper">
                <img src="${imgSrc}" />
              </div>
              <div class="footer">Generated offline with ToolBox X</div>
            </div>
          `;
        })
      );

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm;
            }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #FFFFFF;
              color: #111827;
            }
            .page {
              page-break-after: always;
              display: flex;
              flex-direction: column;
              height: 100vh;
              max-height: 100vh;
              justify-content: space-between;
              padding: 10px 0;
            }
            .page:last-child {
              page-break-after: avoid;
            }
            .header {
              font-size: 11px;
              color: #6B7280;
              border-bottom: 1px solid #E5E7EB;
              padding-bottom: 8px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .image-wrapper {
              flex: 1;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 15px 0;
              overflow: hidden;
            }
            img {
              max-width: 100%;
              max-height: 80vh;
              object-fit: contain;
              border-radius: 4px;
            }
            .footer {
              font-size: 10px;
              color: #9CA3AF;
              text-align: right;
              border-top: 1px solid #E5E7EB;
              padding-top: 8px;
            }
          </style>
        </head>
        <body>
          ${renderedPages.join('')}
        </body>
        </html>
      `;

      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      const fname = `ToolBoxX_Document_${dateStr}.pdf`;

      const result = await Print.printToFileAsync({ html });
      const targetPath = `${FileSystem.cacheDirectory}${fname}`;
      await FileSystem.copyAsync({ from: result.uri, to: targetPath });

      const info = await FileSystem.getInfoAsync(targetPath);
      const bytes = info.exists && 'size' in info && typeof info.size === 'number' ? info.size : 0;

      setPdfUri(targetPath);
      setPdfFilename(fname);
      setPdfSizeFormatted(formatBytes(bytes));
      triggerHaptic('success');
    } catch (err: any) {
      Alert.alert('PDF Generation Failed', err?.message || 'Could not create PDF document.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPdf = async () => {
    if (!pdfUri) return;
    triggerHaptic('light');
    try {
      await Print.printAsync({ uri: pdfUri });
    } catch {
      // If print dialog fails, fall back to share sheet
      await sharePdfFile(pdfUri, 'Open PDF Document');
    }
  };

  const handleSaveToDevice = async () => {
    if (!pdfUri) return;
    triggerHaptic('light');

    const savedPath = await saveFileToDocuments(pdfUri, pdfFilename || `ToolBoxX_Document_${Date.now()}.pdf`);
    if (savedPath) {
      setSavedSuccess(true);
      triggerHaptic('success');
      Alert.alert('Saved to Documents', `PDF saved successfully as ${pdfFilename}`);
    } else {
      Alert.alert('Save Failed', 'Could not save PDF file to device storage.');
    }
  };

  const handleShare = async () => {
    if (!pdfUri) return;
    triggerHaptic('light');
    await sharePdfFile(pdfUri, 'Share PDF Document');
  };

  // Online Collab Room Management
  const handleCreateRoom = () => {
    if (!isConnected) {
      Alert.alert('Internet Required', 'Live document collaboration requires an internet connection.');
      return;
    }
    const code = generateRoomCode();
    setRoomCode(code);
    setCollabConnected(true);
    triggerHaptic('success');
  };

  const handleJoinRoom = () => {
    if (!isConnected) {
      Alert.alert('Internet Required', 'Live document collaboration requires an internet connection.');
      return;
    }
    const cleaned = inputRoomCode.trim().toUpperCase();
    if (cleaned.length < 4) {
      Alert.alert('Invalid Code', 'Please enter a valid room code.');
      return;
    }
    setRoomCode(cleaned);
    setCollabConnected(true);
    triggerHaptic('success');
  };

  useEffect(() => {
    if (!collabConnected || !roomCode) return;

    const unsubscribe = subscribeRoom(roomCode, (msg: RoomMessage) => {
      if (msg.senderId === myClientId) return;
      if (msg.type === 'sync' && msg.payload?.notes) {
        setCollabNotes(msg.payload.notes);
      } else if (msg.type === 'text' && msg.payload?.text) {
        setPeerMessages((prev) => [...prev.slice(-4), `Friend: ${msg.payload.text}`]);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [collabConnected, roomCode, myClientId]);

  const handleSendCollabNote = async (text: string) => {
    setCollabNotes(text);
    if (collabConnected && roomCode && isConnected) {
      await sendRoomMessage(roomCode, myClientId, 'sync', { notes: text });
    }
  };

  const handleShareCollabLink = async () => {
    if (!roomCode) return;
    await shareRoomInvite('Document Collaboration', roomCode, 'live_share');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="PDF Maker & Tools"
        subtitle="Images to PDF generator & collaborative document hub"
        onBack={onBack}
      />

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            triggerHaptic('light');
            setActiveTab('create');
          }}
          style={[
            styles.tabItem,
            activeTab === 'create' && {
              backgroundColor: theme.primary,
              borderRadius: 8,
            },
          ]}
        >
          <Ionicons
            name="document-text-outline"
            size={16}
            color={activeTab === 'create' ? '#FFFFFF' : theme.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'create' ? '#FFFFFF' : theme.textSecondary },
            ]}
          >
            Create PDF (Offline)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            triggerHaptic('light');
            setActiveTab('collab');
          }}
          style={[
            styles.tabItem,
            activeTab === 'collab' && {
              backgroundColor: theme.primary,
              borderRadius: 8,
            },
          ]}
        >
          <Ionicons
            name="share-social-outline"
            size={16}
            color={activeTab === 'collab' ? '#FFFFFF' : theme.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'collab' ? '#FFFFFF' : theme.textSecondary },
            ]}
          >
            Friend Collab (Online)
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'create' ? (
          <>
            {/* Header Action Bar */}
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.cardHeaderRow}>
                <View>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>Document Pages</Text>
                  <Text style={[styles.cardSub, { color: theme.textMuted }]}>
                    {images.length === 0 ? 'No photos selected' : `${images.length} page(s) ready`}
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={pickImages}
                  style={[styles.addBtn, { backgroundColor: theme.primary }]}
                >
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                  <Text style={styles.addBtnText}>Add Photos</Text>
                </TouchableOpacity>
              </View>

              {images.length === 0 ? (
                <View style={styles.emptyCard}>
                  <View style={[styles.iconCircle, { backgroundColor: theme.primaryGlow }]}>
                    <Ionicons name="images-outline" size={32} color={theme.primary} />
                  </View>
                  <Text style={[styles.emptyPromptTitle, { color: theme.text }]}>No Images Added</Text>
                  <Text style={[styles.emptyPromptSub, { color: theme.textMuted }]}>
                    Select single or multiple photos to convert into an A4 PDF document
                  </Text>
                </View>
              ) : (
                <View style={styles.pagesList}>
                  {images.map((item, index) => (
                    <View
                      key={item.id}
                      style={[styles.pageRow, { backgroundColor: theme.background, borderColor: theme.border }]}
                    >
                      <View style={styles.pageIndexBadge}>
                        <Text style={[styles.pageIndexText, { color: theme.textMuted }]}>P.{index + 1}</Text>
                      </View>

                      <Image source={{ uri: item.uri }} style={styles.pageThumb} resizeMode="cover" />

                      <View style={styles.pageInfo}>
                        <Text style={[styles.pageTitle, { color: theme.text }]}>Page {index + 1}</Text>
                        <Text style={[styles.pageSub, { color: theme.textMuted }]}>
                          {item.width && item.height ? `${item.width} × ${item.height}` : 'Photo'}
                        </Text>
                      </View>

                      {/* Reorder & Remove Controls */}
                      <View style={styles.reorderControls}>
                        <TouchableOpacity
                          disabled={index === 0}
                          onPress={() => moveUp(index)}
                          style={[styles.miniBtn, index === 0 && { opacity: 0.3 }]}
                        >
                          <Ionicons name="arrow-up" size={16} color={theme.text} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          disabled={index === images.length - 1}
                          onPress={() => moveDown(index)}
                          style={[styles.miniBtn, index === images.length - 1 && { opacity: 0.3 }]}
                        >
                          <Ionicons name="arrow-down" size={16} color={theme.text} />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => removeImage(index)} style={styles.miniBtn}>
                          <Ionicons name="trash-outline" size={16} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Create PDF Action */}
              {images.length > 0 && (
                <TouchableOpacity
                  disabled={loading}
                  activeOpacity={0.85}
                  onPress={handleGeneratePDF}
                  style={[styles.generateBtn, { backgroundColor: theme.primary }]}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="document-attach-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.generateBtnText}>
                        Create PDF Document ({images.length} {images.length === 1 ? 'Page' : 'Pages'})
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Created PDF Result Card */}
            {pdfUri && (
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.resultHeader}>
                  <View style={[styles.checkCircle, { backgroundColor: '#16A34A' }]}>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.resultTitle, { color: theme.text }]}>PDF Created Successfully</Text>
                    <Text style={[styles.resultFilename, { color: theme.textMuted }]} numberOfLines={1}>
                      {pdfFilename}
                    </Text>
                    <Text style={[styles.resultMeta, { color: theme.textSecondary }]}>
                      {images.length} Pages • {pdfSizeFormatted} • A4 Standard
                    </Text>
                  </View>
                </View>

                {/* Triple Action Buttons: Open, Save, Share */}
                <View style={styles.resultActions}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleOpenPdf}
                    style={[styles.actionChip, { backgroundColor: theme.background, borderColor: theme.border }]}
                  >
                    <Ionicons name="eye-outline" size={16} color={theme.primary} />
                    <Text style={[styles.actionChipText, { color: theme.text }]}>Open PDF</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleSaveToDevice}
                    style={[
                      styles.actionChip,
                      {
                        backgroundColor: savedSuccess ? '#16A34A' : theme.background,
                        borderColor: savedSuccess ? '#16A34A' : theme.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={savedSuccess ? 'checkmark-circle' : 'download-outline'}
                      size={16}
                      color={savedSuccess ? '#FFFFFF' : theme.primary}
                    />
                    <Text style={[styles.actionChipText, { color: savedSuccess ? '#FFFFFF' : theme.text }]}>
                      {savedSuccess ? 'Saved' : 'Save PDF'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleShare}
                    style={[styles.actionChip, { backgroundColor: theme.primary, borderColor: theme.primary }]}
                  >
                    <Ionicons name="share-social-outline" size={16} color="#FFFFFF" />
                    <Text style={[styles.actionChipText, { color: '#FFFFFF' }]}>Share PDF</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        ) : (
          /* Collaborative Online Shared Hub */
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.collabHeader}>
              <View style={[styles.iconCircle, { backgroundColor: theme.primaryGlow }]}>
                <Ionicons name="people-outline" size={28} color={theme.primary} />
              </View>
              <Text style={[styles.collabTitle, { color: theme.text }]}>Real-time Friend Collaboration</Text>
              <Text style={[styles.collabSub, { color: theme.textMuted }]}>
                Share a live session link to plan and structure documents simultaneously with a friend when online.
              </Text>
            </View>

            {!isConnected ? (
              <View style={[styles.offlineNotice, { backgroundColor: 'rgba(220, 38, 38, 0.1)', borderColor: '#DC2626' }]}>
                <Ionicons name="wifi-outline" size={20} color="#DC2626" />
                <Text style={styles.offlineNoticeText}>
                  Internet Connection Required. Please connect to the internet to collaborate with friends.
                </Text>
              </View>
            ) : !collabConnected ? (
              <View style={styles.roomSetupBox}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleCreateRoom}
                  style={[styles.primaryActionBtn, { backgroundColor: theme.primary, marginBottom: 12 }]}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryActionBtnText}>Create New Collab Room</Text>
                </TouchableOpacity>

                <View style={styles.orDivider}>
                  <View style={[styles.orLine, { backgroundColor: theme.border }]} />
                  <Text style={[styles.orText, { color: theme.textMuted }]}>OR JOIN EXISTING</Text>
                  <View style={[styles.orLine, { backgroundColor: theme.border }]} />
                </View>

                <View style={styles.joinRow}>
                  <TextInput
                    style={[
                      styles.roomInput,
                      { backgroundColor: theme.background, color: theme.text, borderColor: theme.border },
                    ]}
                    placeholder="ENTER 6-DIGIT CODE"
                    placeholderTextColor={theme.textMuted}
                    value={inputRoomCode}
                    onChangeText={setInputRoomCode}
                    autoCapitalize="characters"
                    maxLength={8}
                  />
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleJoinRoom}
                    style={[styles.joinBtn, { backgroundColor: theme.primary }]}
                  >
                    <Text style={styles.joinBtnText}>Join</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.activeRoomBox}>
                {/* Room Info Banner */}
                <View style={[styles.roomBanner, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <View>
                    <Text style={[styles.roomLabel, { color: theme.textMuted }]}>ACTIVE ROOM CODE</Text>
                    <Text style={[styles.roomCodeText, { color: theme.primary }]}>{roomCode}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleShareCollabLink}
                    style={[styles.shareLinkBtn, { backgroundColor: theme.primaryGlow }]}
                  >
                    <Ionicons name="share-outline" size={16} color={theme.primary} />
                    <Text style={[styles.shareLinkText, { color: theme.primary }]}>Share Invite Link</Text>
                  </TouchableOpacity>
                </View>

                {/* Collaborative Shared Document Plan */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginTop: 14 }]}>
                  SHARED DOCUMENT OUTLINE & NOTES
                </Text>
                <TextInput
                  style={[
                    styles.notesInput,
                    { backgroundColor: theme.background, color: theme.text, borderColor: theme.border },
                  ]}
                  placeholder="Type notes or page guidelines here. Both participants will see live updates..."
                  placeholderTextColor={theme.textMuted}
                  multiline
                  value={collabNotes}
                  onChangeText={handleSendCollabNote}
                />

                {peerMessages.length > 0 && (
                  <View style={styles.chatLog}>
                    {peerMessages.map((m, i) => (
                      <Text key={i} style={[styles.chatLine, { color: theme.textSecondary }]}>
                        {m}
                      </Text>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  onPress={() => {
                    setCollabConnected(false);
                    setRoomCode('');
                  }}
                  style={styles.leaveBtn}
                >
                  <Text style={styles.leaveBtnText}>Leave Collaboration Session</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardSub: {
    fontSize: 12,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyPromptTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyPromptSub: {
    fontSize: 12,
    textAlign: 'center',
  },
  pagesList: {
    gap: 8,
    marginBottom: 16,
  },
  pageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  pageIndexBadge: {
    width: 32,
    alignItems: 'center',
  },
  pageIndexText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pageThumb: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#000',
    marginRight: 10,
  },
  pageInfo: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  pageSub: {
    fontSize: 11,
    marginTop: 2,
  },
  reorderControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniBtn: {
    padding: 6,
    borderRadius: 6,
  },
  generateBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 8,
  },
  generateBtnText: {
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
  resultFilename: {
    fontSize: 12,
    marginTop: 2,
  },
  resultMeta: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  resultActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  actionChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  collabHeader: {
    alignItems: 'center',
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  collabTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  collabSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  offlineNoticeText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  roomSetupBox: {
    marginTop: 8,
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
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 8,
  },
  orLine: {
    flex: 1,
    height: 1,
  },
  orText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  joinRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roomInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  joinBtn: {
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  joinBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  activeRoomBox: {
    marginTop: 4,
  },
  roomBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  roomLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  roomCodeText: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 1,
  },
  shareLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  shareLinkText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  notesInput: {
    height: 120,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    textAlignVertical: 'top',
    lineHeight: 18,
  },
  chatLog: {
    marginTop: 10,
    padding: 8,
  },
  chatLine: {
    fontSize: 11,
    marginBottom: 4,
  },
  leaveBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 12,
  },
  leaveBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
});
