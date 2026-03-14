declare global {
  interface Window {
    ethereum?: any;
    trustWallet?: any;
    coinbaseWalletExtension?: any;
    phantom?: any;
  }
}

export type WalletProvider = 'metamask' | 'trustwallet' | 'coinbase' | 'phantom' | 'walletconnect';

export interface WalletOption {
  id: WalletProvider;
  name: string;
  icon: string;
  installUrl: string;
  detected: boolean;
}

export const detectMetaMask = (): boolean => {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
}

export const detectTrustWallet = (): boolean => {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined' && window.ethereum.isTrust;
}

export const detectCoinbase = (): boolean => {
  return typeof window !== 'undefined' && typeof window.coinbaseWalletExtension !== 'undefined';
}

export const detectPhantom = (): boolean => {
  return typeof window !== 'undefined' && typeof window.phantom !== 'undefined';
}

export const detectAnyWallet = (): boolean => {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
}

export const getAvailableWallets = (): WalletOption[] => {
  return [
    {
      id: 'metamask',
      name: 'MetaMask',
      icon: '🦊',
      installUrl: 'https://metamask.io/download/',
      detected: detectMetaMask()
    },
    {
      id: 'trustwallet',
      name: 'Trust Wallet',
      icon: '🛡️',
      installUrl: 'https://trustwallet.com/download',
      detected: detectTrustWallet()
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      icon: '🔵',
      installUrl: 'https://www.coinbase.com/wallet/downloads',
      detected: detectCoinbase()
    },
    {
      id: 'phantom',
      name: 'Phantom',
      icon: '👻',
      installUrl: 'https://phantom.app/download',
      detected: detectPhantom()
    },
    {
      id: 'walletconnect',
      name: 'WalletConnect',
      icon: '🔗',
      installUrl: 'https://walletconnect.com/',
      detected: false
    }
  ];
}

export const connectWallet = async (provider?: WalletProvider): Promise<string | null> => {
  if (!detectAnyWallet()) {
    return null;
  }

  try {
    let walletProvider = window.ethereum;

    if (provider === 'trustwallet' && window.ethereum?.isTrust) {
      walletProvider = window.ethereum;
    } else if (provider === 'coinbase' && window.coinbaseWalletExtension) {
      walletProvider = window.coinbaseWalletExtension;
    } else if (provider === 'phantom' && window.phantom?.ethereum) {
      walletProvider = window.phantom.ethereum;
    }

    const accounts = await walletProvider.request({
      method: 'eth_requestAccounts'
    });

    if (accounts && accounts.length > 0) {
      return accounts[0];
    }

    return null;
  } catch (error) {
    console.error('Error connecting to wallet:', error);
    throw error;
  }
}

export const getConnectedWallet = async (): Promise<string | null> => {
  if (!detectMetaMask()) {
    return null;
  }

  try {
    const accounts = await window.ethereum.request({
      method: 'eth_accounts'
    });

    if (accounts && accounts.length > 0) {
      return accounts[0];
    }

    return null;
  } catch (error) {
    console.error('Error getting connected wallet:', error);
    return null;
  }
}

export const formatWalletAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export const switchToNetwork = async (chainId: string) => {
  if (!detectMetaMask()) {
    return false;
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId }],
    });
    return true;
  } catch (error: any) {
    if (error.code === 4902) {
      console.error('Network not added to MetaMask');
    }
    throw error;
  }
}

export const BSC_CHAIN_ID = '0x38'; // BSC Mainnet

export const addBSCNetwork = async () => {
  if (!detectMetaMask()) {
    return false;
  }

  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: BSC_CHAIN_ID,
        chainName: 'BNB Smart Chain',
        nativeCurrency: {
          name: 'BNB',
          symbol: 'BNB',
          decimals: 18
        },
        rpcUrls: ['https://bsc-dataseed.binance.org/'],
        blockExplorerUrls: ['https://bscscan.com/']
      }]
    });
    return true;
  } catch (error) {
    console.error('Error adding BSC network:', error);
    throw error;
  }
}
