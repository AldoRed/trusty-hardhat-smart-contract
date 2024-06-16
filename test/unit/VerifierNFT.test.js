const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("VerifierNFT", () => {
          let verifierNFT, trustCoin, deployer, user1, chai, assert, expect
          const chainId = network.config.chainId
          const verificationFee = networkConfig[chainId]["verificationFee"]

          before(async () => {
              chai = await import("chai")
              assert = chai.assert
              expect = chai.expect
              const accounts = await getNamedAccounts()
              deployer = accounts.deployer
              user1 = accounts.user1
              user2 = accounts.user2
              await deployments.fixture(["all"])

              trustCoin = await ethers.getContract("TrustCoin", deployer)
              verifierNFT = await ethers.getContract("VerifierNFT", deployer)
          })
          it("VerifierNFT was deployed", async () => {
              expect(verifierNFT.target).to.properAddress
          })
          describe("Constructor", () => {
              it("initializes the trustCoin address", async () => {
                  const trustCoinAddress = await verifierNFT.getTrustyCoin()
                  expect(trustCoinAddress).to.equal(trustCoin.target)
              })
              it("initializes the verification fee", async () => {
                  const verificationFeeContract = await verifierNFT.getVerificationFee()
                  expect(verificationFeeContract).to.equal((verificationFee * 10 ** 18).toString())
              })
          })
      })
