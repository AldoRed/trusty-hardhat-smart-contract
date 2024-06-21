const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("TrustyCoinSale", () => {
          let trustyCoinSale, trustyCoin, initialSupply, deployer, user1, chai, assert, expect, rate
          const multipler = 10 ** 18

          before(async () => {
              chai = await import("chai")
              assert = chai.assert
              expect = chai.expect
              const accounts = await getNamedAccounts()
              //console.log(accounts)
              deployer = accounts.deployer
              user1 = accounts.user1
              user2 = accounts.user2
              await deployments.fixture(["all"])

              const chainId = network.config.chainId
              initialSupply = networkConfig[chainId]["initialSupply"]
              rate = networkConfig[chainId]["rate"]

              trustyCoinSale = await ethers.getContract("TrustyCoinSale", deployer)
              trustyCoin = await ethers.getContract("TrustyCoin", deployer)
              trustyCoinSaleByUser1 = await ethers.getContract("TrustyCoinSale", user1)

              // Transfer all TrustyCoin to TrustyCoinSale
              await trustyCoin.transfer(trustyCoinSale.target, trustyCoin.balanceOf(deployer))
          })

          it("TrustyCoinSale was deploy", async () => {
              expect(trustyCoinSale.target).to.properAddress
          })
          describe("Constructor", () => {
              it("initializes the token with the correct name and symbol", async () => {
                  const name = await trustyCoin.name()
                  const symbol = await trustyCoin.symbol()
                  expect(name).to.equal("TrustyCoin")
                  expect(symbol).to.equal("TCN")
              })
              it("initializes the rate", async () => {
                  const rateContract = await trustyCoinSale.getRate()
                  expect(rateContract).to.equal(rate.toString())
              })
          })
          describe("buyTokens", () => {
              it("Should be able to buy tokens successfully", async () => {
                  const tokensToSend = ethers.parseEther("1")
                  let balanceBefore = await trustyCoin.balanceOf(user1)
                  await trustyCoinSaleByUser1.buyTokens({ value: tokensToSend })

                  expect(await trustyCoin.balanceOf(user1)).to.equal(
                      (
                          Number(tokensToSend.toString() * rate) + Number(balanceBefore.toString())
                      ).toString()
                  )
              })
              it("should not be able to buy more tokens than available", async () => {
                  const tokensToSend = ethers.parseEther("100")
                  await expect(
                      trustyCoinSaleByUser1.buyTokens({ value: tokensToSend })
                  ).to.be.rejectedWith("Not enough tokens available")
              })
              it("should emit an event TokensPurchased", async () => {
                  const tokensToSend = ethers.parseEther("1")
                  await expect(trustyCoinSaleByUser1.buyTokens({ value: tokensToSend })).to.emit(
                      trustyCoinSaleByUser1,
                      "TokensPurchased"
                  )
              })
          })
          describe("withdraw", () => {
              it("Should be able to withdraw successfully", async () => {
                  const balanceBefore = await ethers.provider.getBalance(deployer)
                  await trustyCoinSale.withdraw()
                  const balanceAfter = await ethers.provider.getBalance(deployer)
                  expect(balanceAfter).to.be.gt(balanceBefore)
              })
              it("should not be able to withdraw if no balance available", async () => {
                  await expect(trustyCoinSale.withdraw()).to.be.rejectedWith(
                      "TrustyCoinSale__NoFunds()"
                  )
              })
          })
          describe("withdrawTokens", () => {
              it("Should be able to withdraw tokens successfully", async () => {
                  const balanceBefore = await trustyCoin.balanceOf(deployer)
                  await trustyCoinSale.withdrawTokens()
                  const balanceAfter = await trustyCoin.balanceOf(deployer)
                  expect(balanceAfter).to.be.gt(balanceBefore)
              })
              it("should not be able to withdraw tokens if no balance available", async () => {
                  await expect(trustyCoinSale.withdrawTokens()).to.be.rejectedWith(
                      "TrustyCoinSale__NoFunds()"
                  )
              })
          })
      })
