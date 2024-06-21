const { network, ethers } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    console.log(`Deploying TrustyCoinSale with account: ${deployer}`)

    const chainId = network.config.chainId
    const trustyCoinAddress = networkConfig[chainId]["trustyCoinAddress"]
    const rate = networkConfig[chainId]["rate"]

    const args = [trustyCoinAddress, rate]

    const trustyCoinSale = await deploy("TrustyCoinSale", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        //Verify
        await verify(trustyCoinSale.address, args)
    }

    log("----------------------------------------")
}

module.exports.tags = ["all", "trustyCoinSale"]
