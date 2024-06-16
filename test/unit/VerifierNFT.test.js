const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("VerifierNFT", () => {
          let verifierNFT,
              trustCoin,
              deployer,
              user1,
              chai,
              assert,
              expect,
              verifierNFTByUser1,
              user2
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
          describe("addAuthorizedPartner", () => {
              before(async () => {
                  verifierNFTByUser1 = await verifierNFT.connect(user1)
              })
              it("should add an authorized partner", async () => {
                  await verifierNFT.addAuthorizedPartner(user1)
                  const isAuthorized = await verifierNFT.getAuthorizedPartner(user1)
                  expect(isAuthorized).to.equal(true)
              })
              it("should not add an authorized partner if not called by owner", async () => {
                  await expect(verifierNFTByUser1.addAuthorizedPartner(user2)).to.be.rejectedWith(
                      "contract runner does not support send"
                  )
              })
              it("should not add an authorized partner if partner is already authorized", async () => {
                  await expect(verifierNFT.addAuthorizedPartner(user1)).to.be.rejectedWith(
                      "VerifierNFT__AlreadyAuthorizedPartner()"
                  )
              })
          })
          describe("removeAuthorizedPartner", () => {
              before(async () => {
                  verifierNFTByUser1 = await verifierNFT.connect(user1)
              })
              it("should remove an authorized partner", async () => {
                  expect(await verifierNFT.getAuthorizedPartner(user1)).to.equal(true)
                  await verifierNFT.removeAuthorizedPartner(user1)
                  const isAuthorized = await verifierNFT.getAuthorizedPartner(user1)
                  expect(isAuthorized).to.equal(false)
              })
              it("should not remove an authorized partner if not called by owner", async () => {
                  await verifierNFT.addAuthorizedPartner(user1)
                  await expect(
                      verifierNFTByUser1.removeAuthorizedPartner(user1)
                  ).to.be.rejectedWith("contract runner does not support send")
              })
              it("should not remove an authorized partner if partner is not authorized", async () => {
                  await expect(verifierNFT.removeAuthorizedPartner(user2)).to.be.rejectedWith(
                      "VerifierNFT__AlreadyUnauthorizedPartner()"
                  )
              })
          })
      })
