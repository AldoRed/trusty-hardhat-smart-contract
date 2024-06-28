const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("VerifierNFT", () => {
          let verifierNFT,
              trustyCoin,
              deployer,
              user1,
              chai,
              assert,
              expect,
              verifierNFTByUser1,
              verifierNFTByUser2,
              trustyCoinByUser2,
              user2,
              timeLimit

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

              trustyCoin = await ethers.getContract("TrustyCoin", deployer)
              verifierNFT = await ethers.getContract("VerifierNFT", deployer)
          })
          it("VerifierNFT was deployed", async () => {
              expect(verifierNFT.target).to.properAddress
          })
          describe("Constructor", () => {
              it("initializes the trustyCoin address", async () => {
                  const trustyCoinAddress = await verifierNFT.getTrustyCoin()
                  expect(trustyCoinAddress).to.equal(trustyCoin.target)
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
              /* In this case it's unnecessary to verify if the argument of authorizedPartner 
                 is an authorized partner because if it's not an authorized partner that 
                 address will not be able to call the function to verify the request. */
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
                  trustyCoinByUser2 = await ethers.getContract("TrustyCoin", user2)
              })
              it("should request verification", async () => {
                  //   console.log("verificationFee", verificationFee)
                  // Get balance of deployer
                  //   console.log("balance of deployer", await trustyCoin.balanceOf(deployer))
                  // Transfer tokens to user2
                  await trustyCoin.transfer(user2, verificationFee)
                  // Get tokens from user2
                  //   console.log("balance of user2", await trustyCoinByUser2.balanceOf(user2))

                  // Allow to spend trustyCoin
                  await trustyCoinByUser2.approve(verifierNFT.target, verificationFee)
                  await verifierNFTByUser2.requestVerification("test", user1)
                  const verification = await verifierNFT.getVerificationRequest(1)
                  expect(verification[0]).to.equal(user2)
                  expect(verification[1]).to.equal("test")
                  // blockTimestamp
                  //   console.log(verification[2].toString())
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
                  await trustyCoinByUser2.approve(verifierNFT.target, verificationFee)
                  await expect(
                      verifierNFTByUser2.requestVerification("test", user1)
                  ).to.be.rejectedWith("ERC20: transfer amount exceeds balance")
              })
              it("should emit an event when a verification request is made", async () => {
                  // Transfer tokens to user2
                  await trustyCoin.transfer(user2, verificationFee)
                  // Approve tokens to spend
                  await trustyCoinByUser2.approve(verifierNFT.target, verificationFee)
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

                  //console.log("logs", logs[2].args)
              })
              it("should the user pay the half of the verification fee if the user don't want a verification with a partner", async () => {
                  // Transfer tokens to user2
                  await trustyCoin.transfer(user2, verificationFee)
                  const balanceBefore = await trustyCoin.balanceOf(user2)
                  // Approve tokens to spend
                  await trustyCoinByUser2.approve(verifierNFT.target, verificationFee)

                  // Request verification passing the address of the partner as 0x
                  await verifierNFTByUser2.requestVerification(
                      "test half fee",
                      "0x0000000000000000000000000000000000000000"
                  )

                  const balanceAfter = await trustyCoin.balanceOf(user2)
                  const halfFee = Number(verificationFee) / 2
                  expect((Number(balanceBefore) - halfFee).toString()).to.equal(balanceAfter)
              })
              it("should the user pay the full verification fee if the user want a verification with a partner", async () => {
                  // Transfer tokens to user2
                  await trustyCoin.transfer(user2, verificationFee)
                  const balanceBefore = await trustyCoin.balanceOf(user2)
                  // Approve tokens to spend
                  await trustyCoinByUser2.approve(verifierNFT.target, verificationFee)

                  // Request verification passing the address of the partner as 0x
                  await verifierNFTByUser2.requestVerification("test full fee", user1)

                  const balanceAfter = await trustyCoin.balanceOf(user2)
                  expect((Number(balanceBefore) - Number(verificationFee)).toString()).to.equal(
                      balanceAfter
                  )
              })
          })
          describe("validateByPartner", () => {
              before(async () => {
                  verifierNFTByUser1 = await ethers.getContract("VerifierNFT", user1)
                  verifierNFTByUser2 = await ethers.getContract("VerifierNFT", user2)
                  trustyCoinByUser2 = await ethers.getContract("TrustyCoin", user2)
                  timeLimit = await verifierNFT.getTimeLimit()
              })
              it("should able to do a verification request an authorizedPartnerValidated", async () => {
                  // Request verification
                  await trustyCoin.transfer(user2, verificationFee)
                  await trustyCoinByUser2.approve(verifierNFT.target, verificationFee)
                  const txResponse = await verifierNFTByUser2.requestVerification("test", user1)
                  const txReceipt = await txResponse.wait(1)
                  const args = txReceipt.logs[2].args
                  const requestId = args.requestId

                  // Validate verification request
                  await verifierNFTByUser1.validateByPartner(requestId)
                  const verification = await verifierNFT.getVerificationRequest(requestId)
                  // authorizedPartnerValidated
                  expect(verification[5]).to.equal(true)
              })
              it("should not able to do a verification request if not an authorized partner", async () => {
                  await trustyCoin.transfer(user2, verificationFee)
                  await trustyCoinByUser2.approve(verifierNFT.target, verificationFee)
                  const txResponse = await verifierNFTByUser2.requestVerification("test", user1)
                  const txReceipt = await txResponse.wait(1)
                  const args = txReceipt.logs[2].args
                  const requestId = args.requestId

                  await expect(verifierNFTByUser2.validateByPartner(requestId)).to.be.rejectedWith(
                      "VerifierNFT__OnlyAuthorizedPartner()"
                  )
              })
              it("should return an error if it's already completed the request", async () => {
                  await trustyCoin.transfer(user2, verificationFee)
                  await trustyCoinByUser2.approve(verifierNFT.target, verificationFee)
                  const txResponse = await verifierNFTByUser2.requestVerification("test", user1)
                  const txReceipt = await txResponse.wait(1)
                  const args = txReceipt.logs[2].args
                  const requestId = args.requestId

                  await network.provider.send("evm_increaseTime", [Number(timeLimit) + 1])
                  await network.provider.send("evm_mine")
                  let checkUpkeep = await verifierNFTByUser1.checkUpkeep("0x")
                  await verifierNFTByUser1.performUpkeep(checkUpkeep[1])

                  await expect(verifierNFTByUser1.validateByPartner(requestId)).to.be.rejectedWith(
                      "VerifierNFT__TheRequestIsCompleted()"
                  )
              })
          })
          describe("checkUpkeep", () => {
              before(async () => {
                  verifierNFTByUser1 = await ethers.getContract("VerifierNFT", user1)
                  verifierNFTByUser2 = await ethers.getContract("VerifierNFT", user2)
                  trustyCoinByUser2 = await ethers.getContract("TrustyCoin", user2)
                  timeLimit = await verifierNFT.getTimeLimit()
              })
              it("should return true if the request is validated by a partner\n\
                and has not been rejected\n\
                and has not been completed\n\
                and has not passed more time than the timeLimit", async () => {
                  await trustyCoin.transfer(user2, verificationFee)
                  await trustyCoinByUser2.approve(verifierNFT.target, verificationFee)
                  const txResponse = await verifierNFTByUser2.requestVerification("test", user1)
                  const txReceipt = await txResponse.wait(1)
                  const args = txReceipt.logs[2].args
                  const requestId = args.requestId

                  await verifierNFTByUser1.validateByPartner(requestId)
                  const checkUpkeep = await verifierNFTByUser1.checkUpkeep("0x")
                  expect(checkUpkeep[0]).to.equal(true)
                  // We need to resolve the pending request to test the next test
                  await verifierNFT.performUpkeep(checkUpkeep[1])
                  let checkUpkeep2 = await verifierNFT.checkUpkeep("0x")
                  expect(checkUpkeep2[0]).to.equal(false)

                  // Here we can check that the request was completed with success
                  // Check the status of the request
                  const verification = await verifierNFT.getVerificationRequest(requestId)
                  // completed request
                  expect(verification[3]).to.equal(true)
              })
              it("should return true if the timeLimit has passed \n\
                and has not been rejected\n\
                and has not been completed\n\
                and has not been validated by a partner", async () => {
                  await trustyCoin.transfer(user2, verificationFee)
                  await trustyCoinByUser2.approve(verifierNFT.target, verificationFee)
                  const txResponse = await verifierNFTByUser2.requestVerification("test", user1)
                  await txResponse.wait(1)

                  // Increase time
                  await network.provider.send("evm_increaseTime", [Number(timeLimit) + 1])
                  await network.provider.send("evm_mine")

                  const checkUpkeep = await verifierNFTByUser1.checkUpkeep("0x")
                  expect(checkUpkeep[0]).to.equal(true)

                  // We need to resolve the pending request to test the next test
                  await verifierNFT.performUpkeep(checkUpkeep[1])
                  let checkUpkeep2 = await verifierNFT.checkUpkeep("0x")
                  expect(checkUpkeep2[0]).to.equal(false)
              })
              it("should return false if the request is validated by a partner\n\
                but has been rejected", async () => {
                  await trustyCoin.transfer(user2, verificationFee)
                  await trustyCoinByUser2.approve(verifierNFT.target, verificationFee)
                  const txResponse = await verifierNFTByUser2.requestVerification("test", user1)
                  const txReceipt = await txResponse.wait(1)
                  const args = txReceipt.logs[2].args
                  const requestId = args.requestId

                  await verifierNFTByUser1.validateByPartner(requestId)
                  await verifierNFTByUser1.rejectVerification(requestId)
                  const checkUpkeep = await verifierNFTByUser1.checkUpkeep("0x")
                  expect(checkUpkeep[0]).to.equal(false)
              })
          })
          describe("performUpkeep", () => {
              before(async () => {
                  verifierNFTByUser1 = await ethers.getContract("VerifierNFT", user1)
                  verifierNFTByUser2 = await ethers.getContract("VerifierNFT", user2)
                  trustyCoinByUser2 = await ethers.getContract("TrustyCoin", user2)
              })
              it("should complete the request", async () => {
                  await trustyCoin.transfer(user2, verificationFee)
                  await trustyCoinByUser2.approve(verifierNFT.target, verificationFee)
                  const txResponse = await verifierNFTByUser2.requestVerification("test", user1)
                  const txReceipt = await txResponse.wait(1)
                  const args = txReceipt.logs[2].args
                  const requestId = args.requestId

                  await verifierNFTByUser1.validateByPartner(requestId)
                  const checkUpkeep = await verifierNFTByUser1.checkUpkeep("0x")
                  await verifierNFTByUser1.performUpkeep(checkUpkeep[1])
                  const verification = await verifierNFT.getVerificationRequest(requestId)
                  // completed request
                  expect(verification[3]).to.equal(true)
              })
              it("should emit an event VerificationCompleted", async () => {
                  await trustyCoin.transfer(user2, verificationFee)
                  await trustyCoinByUser2.approve(verifierNFT.target, verificationFee)
                  const txResponse = await verifierNFTByUser2.requestVerification("test", user1)
                  const txReceipt = await txResponse.wait(1)
                  const args = txReceipt.logs[2].args
                  const requestId = args.requestId

                  await verifierNFTByUser1.validateByPartner(requestId)
                  const checkUpkeep = await verifierNFTByUser1.checkUpkeep("0x")
                  const txResponse2 = await verifierNFTByUser1.performUpkeep(checkUpkeep[1])
                  const txReceipt2 = await txResponse2.wait(1)
                  //const logs = txReceipt2.logs
                  //console.log("logs", logs)

                  await expect(txReceipt2).to.emit(verifierNFT, "VerificationCompleted")
              })
          })
          describe("rejectVerification", () => {
              before(async () => {
                  verifierNFTByUser1 = await ethers.getContract("VerifierNFT", user1)
                  verifierNFTByUser2 = await ethers.getContract("VerifierNFT", user2)
                  trustyCoinByUser2 = await ethers.getContract("TrustyCoin", user2)
              })
              it("should reject the request", async () => {
                  await trustyCoin.transfer(user2, verificationFee)
                  await trustyCoinByUser2.approve(verifierNFT.target, verificationFee)
                  const txResponse = await verifierNFTByUser2.requestVerification("test", user1)
                  const txReceipt = await txResponse.wait(1)
                  const args = txReceipt.logs[2].args
                  const requestId = args.requestId

                  await verifierNFTByUser1.rejectVerification(requestId)
                  const verification = await verifierNFT.getVerificationRequest(requestId)
                  // rejected request
                  expect(verification[4]).to.equal(true)
              })
              it("should not be able to reject the request if it's already completed", async () => {
                  await trustyCoin.transfer(user2, verificationFee)
                  await trustyCoinByUser2.approve(verifierNFT.target, verificationFee)
                  const txResponse = await verifierNFTByUser2.requestVerification("test", user1)
                  const txReceipt = await txResponse.wait(1)
                  const args = txReceipt.logs[2].args
                  const requestId = args.requestId

                  await network.provider.send("evm_increaseTime", [Number(timeLimit) + 1])
                  await network.provider.send("evm_mine")
                  let checkUpkeep = await verifierNFTByUser1.checkUpkeep("0x")
                  await verifierNFTByUser1.performUpkeep(checkUpkeep[1])

                  await expect(verifierNFTByUser1.rejectVerification(requestId)).to.be.rejectedWith(
                      "VerifierNFT__TheRequestIsCompleted()"
                  )
              })
              it("should not be able to reject the request if it's already rejected", async () => {
                  await trustyCoin.transfer(user2, verificationFee)
                  await trustyCoinByUser2.approve(verifierNFT.target, verificationFee)
                  const txResponse = await verifierNFTByUser2.requestVerification("test", user1)
                  const txReceipt = await txResponse.wait(1)
                  const args = txReceipt.logs[2].args
                  const requestId = args.requestId

                  await verifierNFTByUser1.rejectVerification(requestId)
                  await expect(verifierNFTByUser1.rejectVerification(requestId)).to.be.rejectedWith(
                      "VerifierNFT__TheRequestIsRejected()"
                  )
              })
              it("should not be able to reject the request if it's not an authorized partner", async () => {
                  await trustyCoin.transfer(user2, verificationFee)
                  await trustyCoinByUser2.approve(verifierNFT.target, verificationFee)
                  const txResponse = await verifierNFTByUser2.requestVerification("test", user1)
                  const txReceipt = await txResponse.wait(1)
                  const args = txReceipt.logs[2].args
                  const requestId = args.requestId

                  await expect(verifierNFTByUser2.rejectVerification(requestId)).to.be.rejectedWith(
                      "VerifierNFT__TheCallerIsNotAuthorizedToReject()"
                  )
              })
              it("should emit an event VerificationRejected", async () => {
                  await trustyCoin.transfer(user2, verificationFee)
                  await trustyCoinByUser2.approve(verifierNFT.target, verificationFee)
                  const txResponse = await verifierNFTByUser2.requestVerification("test", user1)
                  const txReceipt = await txResponse.wait(1)
                  const args = txReceipt.logs[2].args
                  const requestId = args.requestId

                  const txResponse2 = await verifierNFTByUser1.rejectVerification(requestId)
                  const txReceipt2 = await txResponse2.wait(1)
                  const logs = txReceipt2.logs

                  await expect(txReceipt2)
                      .to.emit(verifierNFT, "VerificationRejected")
                      .withArgs(requestId, user2, user1)
              })
          })
          describe("balanceOf", () => {
              it("should return the balance of the user", async () => {
                  const balance = await verifierNFT.balanceOf(user1)
                  expect(balance).to.equal(0)
              })
              it("should return the balance of the user2 major than 0, because the tests before", async () => {
                  const balance = await verifierNFT.balanceOf(user2)
                  expect(balance).to.be.above(0)
              })
          })
      })
