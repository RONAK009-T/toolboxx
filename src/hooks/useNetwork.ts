import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { NetworkState } from '../types';
import { getSettings } from '../storage/storage';

export const useNetwork = () => {
  const [state, setState] = useState<NetworkState>({
    isConnected: true,
    isInternetReachable: true,
    isSimulatedOffline: false,
    isOnline: true,
  });

  useEffect(() => {
    let isMounted = true;

    // Load initial simulate offline setting
    getSettings().then((settings) => {
      if (isMounted) {
        setState((prev) => {
          const sim = !!settings.simulateOffline;
          const online = sim ? false : !!prev.isConnected;
          return { ...prev, isSimulatedOffline: sim, isOnline: online };
        });
      }
    });

    const unsubscribe = NetInfo.addEventListener((netState: NetInfoState) => {
      if (!isMounted) return;
      setState((prev) => {
        const isConnected = netState.isConnected ?? false;
        const isReachable = netState.isInternetReachable ?? isConnected;
        const isOnline = prev.isSimulatedOffline ? false : isConnected;
        return {
          ...prev,
          isConnected,
          isInternetReachable: isReachable,
          isOnline,
        };
      });
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const setSimulatedOffline = (simulated: boolean) => {
    setState((prev) => ({
      ...prev,
      isSimulatedOffline: simulated,
      isOnline: simulated ? false : !!prev.isConnected,
    }));
  };

  return {
    ...state,
    setSimulatedOffline,
  };
};
