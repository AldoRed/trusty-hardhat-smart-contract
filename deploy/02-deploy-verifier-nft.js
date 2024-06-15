const { network, ethers } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    console.log(`Deploying VerifierNFT with account: ${deployer}`)

    const chainId = network.config.chainId
    const trustCoinAddress = networkConfig[chainId]["trustCoinAddress"]
    const verificationFee = networkConfig[chainId]["verificationFee"]

    const args = [trustCoinAddress, verificationFee]

    const verifierNFT = await deploy("VerifierNFT", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        //Verify
        await verify(verifierNFT.address, args)
    }

    log("----------------------------------------")
}
