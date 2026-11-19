import { Alert, Share, Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

export interface ShareResult {
  success: boolean;
  error?: string;
}

/**
 * Validates that a file URI exists and is accessible.
 */
export const verifyFileExists = async (fileUri: string): Promise<boolean> => {
  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    return info.exists && 'size' in info && typeof info.size === 'number' && info.size > 0;
  } catch {
    return false;
  }
};

/**
 * Shares an actual image file (PNG / JPEG / WEBP) via Android / iOS system share sheet.
 * Guaranteed to share the genuine file with correct MIME type, NOT text or filename.
 */
export const shareImageFile = async (
  fileUri: string,
  options?: { mimeType?: string; dialogTitle?: string }
): Promise<ShareResult> => {
  try {
    const exists = await verifyFileExists(fileUri);
    if (!exists) {
      Alert.alert('File Error', 'The image file could not be located on device storage.');
      return { success: false, error: 'File does not exist' };
    }

    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (!isSharingAvailable) {
      Alert.alert('Sharing Unavailable', 'Native file sharing is not supported on this device.');
      return { success: false, error: 'Sharing unavailable' };
    }

    // Determine MIME type from extension or option
    let mimeType = options?.mimeType || 'image/png';
    const lower = fileUri.toLowerCase();
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
      mimeType = 'image/jpeg';
    } else if (lower.endsWith('.webp')) {
      mimeType = 'image/webp';
    }

    await Sharing.shareAsync(fileUri, {
      mimeType,
      dialogTitle: options?.dialogTitle || 'Share Image',
      UTI: mimeType === 'image/jpeg' ? 'public.jpeg' : 'public.png',
    });

    return { success: true };
  } catch (err: any) {
    // User dismiss is not an error
    return { success: false, error: err?.message };
  }
};

/**
 * Shares a genuine PDF file with application/pdf MIME type.
 * Populates Android share sheet with WhatsApp, Drive, Gmail, Files, etc.
 */
export const sharePdfFile = async (
  fileUri: string,
  dialogTitle: string = 'Share PDF Document'
): Promise<ShareResult> => {
  try {
    const exists = await verifyFileExists(fileUri);
    if (!exists) {
      Alert.alert('PDF Error', 'The generated PDF file does not exist or is empty.');
      return { success: false, error: 'PDF file does not exist' };
    }

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Sharing Unavailable', 'File sharing is not supported on this platform.');
      return { success: false, error: 'Sharing unavailable' };
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/pdf',
      dialogTitle,
      UTI: 'com.adobe.pdf',
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
};

/**
 * Shares plain text or URL.
 */
export const sharePlainText = async (
  text: string,
  title?: string
): Promise<ShareResult> => {
  try {
    await Share.share({
      message: text,
      title: title || 'ToolBox X',
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
};

/**
 * Saves a file to document directory and gives user confirmation.
 */
export const saveFileToDocuments = async (
  sourceUri: string,
  targetFileName: string
): Promise<string | null> => {
  try {
    const targetPath = `${FileSystem.documentDirectory}${targetFileName}`;
    await FileSystem.copyAsync({
      from: sourceUri,
      to: targetPath,
    });
    return targetPath;
  } catch {
    return null;
  }
};
