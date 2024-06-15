const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("TrustCoin", () => {
          let trustCoin, initialSupply

          before(async () => {
              chai = await import("chai")
              assert = chai.assert
              expect = chai.expect
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])

              const chainId = network.config.chainId
              initialSupply = networkConfig[chainId]["initialSupply"]

              trustCoin = await ethers.getContract("TrustCoin", deployer)
          })

          it("Trust Coin was deploy", async () => {
              expect(trustCoin.target).to.properAddress
          })

          it("Should assign the initial supply of TrustCoin to the deployer", async () => {
              const deployerBalance = (await trustCoin.balanceOf(deployer)).toString()
              expect(deployerBalance).to.equal(initialSupply)
          })
      })
