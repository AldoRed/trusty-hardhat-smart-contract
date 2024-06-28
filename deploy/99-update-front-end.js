const { ethers, getNamedAccounts, deployments, network } = require("hardhat")
const fs = require("fs")

const FRONT_END_ADDRESSES_FILE = "../frontend-trusty-coin/constants/contractAddresses.json"
const FRONT_END_ABI_FILE = "../frontend-trusty-coin/constants/abi.json"
var deployer

module.exports = async function () {
    if (process.env.UPDATE_FRONT_END) {
        const accounts = await getNamedAccounts()
        deployer = accounts.deployer
        console.log("Updating front end...")
        await updateAbi()
        await updateContractAddresses()
    }
}

async function updateAbi() {
    console.log("Updating ABI...")
    const verifierNFT = await ethers.getContract("VerifierNFT", deployer)
    const abiVerifierNFT = JSON.stringify(verifierNFT.interface.fragments)
    const trustyCoin = await ethers.getContract("TrustyCoin", deployer)
    const abiTrustyCoin = JSON.stringify(trustyCoin.interface.fragments)
    const trustyCoinSale = await ethers.getContract("TrustyCoinSale", deployer)
    const abiTrustyCoinSale = JSON.stringify(trustyCoinSale.interface.fragments)

    const abi = JSON.stringify({
        TrustyCoin: abiTrustyCoin,
        TrustyCoinSale: abiTrustyCoinSale,
        VerifierNFT: abiVerifierNFT,
    })

    fs.writeFileSync(FRONT_END_ABI_FILE, abi)
}

async function updateContractAddresses() {
    console.log("Updating front end addresses...")
    const trustyCoin = await ethers.getContract("TrustyCoin", deployer)
    const trustyCoinSale = await ethers.getContract("TrustyCoinSale", deployer)
    const verifierNFT = await ethers.getContract("VerifierNFT", deployer)

    const chainId = network.config.chainId.toString()
    const currentAddresses = JSON.parse(fs.readFileSync(FRONT_END_ADDRESSES_FILE, "utf8"))

    console.log("Current front end addresses...", currentAddresses)

    if (chainId in currentAddresses) {
        if (!currentAddresses[chainId].includes(trustyCoin.target)) {
            currentAddresses[chainId].push(trustyCoin.target)
        }
        if (!currentAddresses[chainId].includes(trustyCoinSale.target)) {
            currentAddresses[chainId].push(trustyCoinSale.target)
        }
        if (!currentAddresses[chainId].includes(verifierNFT.target)) {
            currentAddresses[chainId].push(verifierNFT.target)
        }
    } else {
        currentAddresses[chainId] = [trustyCoin.target, trustyCoinSale.target, verifierNFT.target]
    }
    console.log("Updating front end addresses...", currentAddresses)

    fs.writeFileSync(FRONT_END_ADDRESSES_FILE, JSON.stringify(currentAddresses, null, 2))
}

module.exports.tags = ["all", "frontend"]
