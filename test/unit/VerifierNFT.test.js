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
              verifierNFTByUser2,
              trustCoinByUser2,
              user2

          const chainId = network.config.chainId
          let verificationFee = networkConfig[chainId]["verificationFee"]

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
                  expect(verificationFeeContract).to.equal(
                      (verificationFee.toString() * 10 ** 18).toString()
                  )
                  verificationFee = verificationFeeContract
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
          describe("requestVerification", () => {
              before(async () => {
                  verifierNFTByUser1 = await ethers.getContract("VerifierNFT", user1)
                  // Add user1 as authorized partner
                  // Check if user1 is authorized
                  if (!(await verifierNFT.getAuthorizedPartner(user1))) {
                      console.log("Adding user1 as authorized partner")
                      await verifierNFT.addAuthorizedPartner(user1)
                  }

                  // connect user2 to verifierNFT
                  verifierNFTByUser2 = await ethers.getContract("VerifierNFT", user2)
                  trustCoinByUser2 = await ethers.getContract("TrustCoin", user2)
              })
              it("should request verification", async () => {
                  console.log("verificationFee", verificationFee)
                  // Get balance of deployer
                  console.log("balance of deployer", await trustCoin.balanceOf(deployer))
                  // Transfer tokens to user2
                  await trustCoin.transfer(user2, verificationFee)
                  // Get tokens from user2
                  console.log("balance of user2", await trustCoinByUser2.balanceOf(user2))

                  // Allow to spend trustCoin
                  await trustCoinByUser2.approve(verifierNFT.target, verificationFee)
                  await verifierNFTByUser2.requestVerification("test", user1)
                  const verification = await verifierNFT.getVerificationRequest(1)
                  expect(verification[0]).to.equal(user2)
                  expect(verification[1]).to.equal("test")
                  // blockTimestamp
                  console.log(verification[2].toString())
                  // completed request
                  expect(verification[3]).to.equal(false)
                  // rejected request
                  expect(verification[4]).to.equal(false)
                  // authorizedPartnerValidated
                  expect(verification[5]).to.equal(false)
                  // authorizedPartner
                  expect(verification[6]).to.equal(user1)
              })
              it("should revert if the requester does not have enough tokens", async () => {
                  // Approve tokens to spend
                  await trustCoinByUser2.approve(verifierNFT.target, verificationFee)
                  await expect(
                      verifierNFTByUser2.requestVerification("test", user1)
                  ).to.be.rejectedWith("ERC20: transfer amount exceeds balance")
              })
              it("should emit an event when a verification request is made", async () => {
                  // Transfer tokens to user2
                  await trustCoin.transfer(user2, verificationFee)
                  // Approve tokens to spend
                  await trustCoinByUser2.approve(verifierNFT.target, verificationFee)
                  const txResponse = await verifierNFTByUser2.requestVerification("test", user1)
                  const txReceipt = await txResponse.wait(1)
                  const logs = txReceipt.logs

                  await expect(txReceipt)
                      .to.emit(verifierNFT, "VerificationRequested")
                      .withArgs(2, user2)

                  /*
                  Here I had a lot of problems trying to decode the logs, because there are 3 logs 
                  but the two first logs are not the event that I want to decode.
                  I tried to decode the logs with the following code and I realized that the logs[2] is the event that I want to decode.
                  in this case if we want to get the values of the event we can use the following code: logs[2].args

                  // Get that event values
                  let abi = await ethers.getContract("VerifierNFT")
                  abi = JSON.stringify(abi.interface.fragments)

                  // Create an interface to parse logs
                  const iface = new ethers.Interface(abi)

                  // Parse each log
                  logs.forEach((log) => {
                      try {
                          const parsedLog = iface.parseLog(log)
                          console.log("\n", parsedLog.args[0].toString(), "\n")
                      } catch (e) {
                          console.log("Log no decodificado")
                      }
                  })

                  */

                  console.log("logs", logs[2].args)
              })
          })
      })
