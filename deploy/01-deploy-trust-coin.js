const { network, ethers } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    console.log(`Deploying TrustCoin with account: ${deployer}`)

    const chainId = network.config.chainId
    const initialSupply = networkConfig[chainId]["initialSupply"]

    const trustCoin = await deploy("TrustCoin", {
        from: deployer,
        args: [initialSupply],
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        //Verify
        await verify(trustCoin.address, args)
    }

    log("----------------------------------------")
}

module.exports.tags = ["all", "trustCoin"]
