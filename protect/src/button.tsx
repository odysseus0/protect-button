import { FunctionComponent, PropsWithChildren } from 'react'
import { AddEthereumChainParameter } from 'metamask-react/lib/metamask-context'
import { HintPreferences } from '@flashbots/matchmaker-ts'

const mungeHints = (hints?: HintPreferences) => {
  const allHintsFalse = hints ? Object.values(hints).reduce((prv, cur) => prv && cur === false, true) : true
  return hints ?
    (allHintsFalse ?
      { // mevshare disabled
        hash: true
      } :
      { // experimental options
        calldata: hints.calldata,
        contract_address: hints.contractAddress,
        function_selector: hints.functionSelector,
        logs: hints.logs,
        hash: true, // (tx/bundle) hash is always shared on Flashbots Matchmaker
      })
    : { /* Default (Stable) config; no params */ }
}

export interface ProtectButtonOptions extends PropsWithChildren {
  /** Callback from useMetaMask() */
  addChain?: (chain: AddEthereumChainParameter) => Promise<void>
  /** Specify data to share; if undefined, uses default [Stable config](https://docs.flashbots.net/flashbots-protect/rpc/mev-share#stable-configuration) */
  hints?: HintPreferences,
  /** ID for iterative bundle-building (default: undefined) */
  bundleId?: string,
  /** Chain to connect to (default: 1) */
  chainId?: number,
  /** Selected builders that are permitted to build blocks using the client's transactions. */
  builders?: Array<string>,
}

/**
 * Button that connects Metamask to Flashbots Protect when it's clicked.
 */
const FlashbotsProtectButton: FunctionComponent<ProtectButtonOptions> = ({
  addChain,
  hints,
  bundleId,
  chainId,
  children,
  builders,
}) => {
  const chainIdActual: number = chainId || 1
  const protectUrl =
    chainIdActual === 5 ? "https://rpc-goerli.flashbots.net" :
      chainIdActual === 11155111 ? "https://rpc-sepolia.flashbots.net" :
        "https://rpc.flashbots.net"
  const rpcUrl = new URL(protectUrl)

  if (hints) {
    for (const entry of Object.entries(mungeHints(hints))) {
      const [hintName, hintEnabled] = entry
      if (hintEnabled) {
        rpcUrl.searchParams.append("hint", hintName)
      }
    }
  }

  if (bundleId) {
    rpcUrl.searchParams.append("bundle", bundleId)
  }

  if (builders) {
    for (const builder of builders) {
      rpcUrl.searchParams.append("builder", builder)
    }
  }

  const connectToProtect = async () => {
    const addChainParams = {
      chainId: `0x${chainIdActual.toString(16)}`,
      chainName: `Flashbots Protect ${chainIdActual === 1 ? "(Mainnet)" :
        chainIdActual === 5 ? "(Goerli)" :
          chainIdActual === 11155111 ? "(Sepolia)" :
            ` on chain ${chainIdActual}`}`,
      iconUrls: ["https://docs.flashbots.net/img/logo.png"],
      nativeCurrency: {
        name: "Ethereum",
        symbol: "ETH",
        decimals: 18,
      },
      rpcUrls: [rpcUrl.toString()],
    }
    if (addChain) {
      try {
        addChain(addChainParams)
      } catch (err) {
        // handle "add" error
        console.error("addChain failed")
        throw err
      }
    } else if ("ethereum" in window) {
      // do it manually with window.ethereum
      try {
        const ethereum: any = window.ethereum
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [addChainParams],
        })
      } catch (err) {
        // handle "add" error
        console.error("addChain failed")
        throw err
      }
    } else {
      throw new Error("ethereum provider not found")
    }
  }

  return (
    <button className="flashButton" onClick={connectToProtect}>{children}</button>
  )
}

export default FlashbotsProtectButton
export { HintPreferences } from "@flashbots/matchmaker-ts"
