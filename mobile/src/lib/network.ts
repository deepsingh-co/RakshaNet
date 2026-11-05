import * as Network from 'expo-network';

/** Unknown network state is treated optimistically; a failed request is the
 * real signal and is recorded by the offline outbox. */
export async function isOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    if (state.isConnected === false) return false;
    if (state.isInternetReachable === false) return false;
    return true;
  } catch {
    return true;
  }
}

export function subscribeNetworkState(
  listener: (online: boolean) => void,
): () => void {
  try {
    const subscription = Network.addNetworkStateListener((state) => {
      listener(state.isConnected !== false && state.isInternetReachable !== false);
    });
    return () => subscription.remove();
  } catch {
    return () => undefined;
  }
}
