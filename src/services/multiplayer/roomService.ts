import { Share } from 'react-native';

export interface RoomMessage {
  id: string;
  senderId: string;
  type: 'move' | 'sync' | 'join' | 'reset' | 'text';
  payload: any;
  timestamp: number;
}

const TOPIC_PREFIX = 'tbxx_';

export const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Sends a real-time message to a shared room.
 */
export const sendRoomMessage = async (
  roomCode: string,
  senderId: string,
  type: RoomMessage['type'],
  payload: any
): Promise<boolean> => {
  try {
    const topic = `${TOPIC_PREFIX}${roomCode.toUpperCase()}`;
    const msg: RoomMessage = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId,
      type,
      payload,
      timestamp: Date.now(),
    };

    const res = await fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(msg),
    });

    return res.ok;
  } catch {
    return false;
  }
};

/**
 * Polls for recent messages in a room.
 */
export const pollRoomMessages = async (
  roomCode: string,
  sinceMs: number = Date.now() - 60000
): Promise<RoomMessage[]> => {
  try {
    const topic = `${TOPIC_PREFIX}${roomCode.toUpperCase()}`;
    // ntfy.sh allows querying recent messages
    const res = await fetch(`https://ntfy.sh/${topic}/json?poll=1&since=${Math.floor(sinceMs / 1000)}`);
    if (!res.ok) return [];

    const text = await res.text();
    const lines = text.trim().split('\n').filter(Boolean);
    const messages: RoomMessage[] = [];

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.message) {
          const inner = JSON.parse(parsed.message);
          if (inner.senderId && inner.type) {
            messages.push(inner);
          }
        }
      } catch {
        // ignore malformed lines
      }
    }

    return messages.sort((a, b) => a.timestamp - b.timestamp);
  } catch {
    return [];
  }
};

/**
 * Subscribes to room updates with auto-polling.
 */
export const subscribeRoom = (
  roomCode: string,
  onMessage: (msg: RoomMessage) => void
): (() => void) => {
  let isSubscribed = true;
  let lastChecked = Date.now() - 5000;
  const seenIds = new Set<string>();

  const poll = async () => {
    if (!isSubscribed) return;
    const msgs = await pollRoomMessages(roomCode, lastChecked);
    for (const m of msgs) {
      if (!seenIds.has(m.id)) {
        seenIds.add(m.id);
        lastChecked = Math.max(lastChecked, m.timestamp);
        onMessage(m);
      }
    }
    if (isSubscribed) {
      setTimeout(poll, 1500); // 1.5s responsive polling interval
    }
  };

  poll();

  return () => {
    isSubscribed = false;
  };
};

/**
 * Shares room invitation link with a friend.
 */
export const shareRoomInvite = async (
  title: string,
  roomCode: string,
  feature: 'tictactoe' | 'live_share'
): Promise<void> => {
  try {
    const link = `https://toolboxx.app/join?feature=${feature}&room=${roomCode}`;
    const message = `Join my ToolBox X ${
      feature === 'tictactoe' ? 'Tic-Tac-Toe Game' : 'Live Tool Session'
    }!\n\nRoom Code: ${roomCode}\n\nJoin Link: ${link}`;

    await Share.share({
      message,
      title: `ToolBox X - ${title}`,
    });
  } catch {
    // ignore
  }
};
