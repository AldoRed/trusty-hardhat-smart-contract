const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("TrustCoin", () => {
          let trustCoin, initialSupply, deployer, user1, chai, assert, expect
          const multipler = 10 ** 18

          before(async () => {
              chai = await import("chai")
              assert = chai.assert
              expect = chai.expect
              const accounts = await getNamedAccounts()
              console.log(accounts)
              deployer = accounts.deployer
              user1 = accounts.user1
              user2 = accounts.user2
              await deployments.fixture(["all"])

              const chainId = network.config.chainId
              initialSupply = networkConfig[chainId]["initialSupply"]

              trustCoin = await ethers.getContract("TrustCoin", deployer)
          })

          it("TrustCoin was deploy", async () => {
              expect(trustCoin.target).to.properAddress
          })
          describe("Constructor", () => {
              it("initializes the total supply", async () => {
                  const totalSupply = await trustCoin.totalSupply()
                  expect(totalSupply).to.equal((initialSupply * multipler).toString())
              })
              it("initializes the token with the correct name and symbol", async () => {
                  const name = await trustCoin.name()
                  const symbol = await trustCoin.symbol()
                  expect(name).to.equal("TrustCoin")
                  expect(symbol).to.equal("TCN")
              })
          })
          describe("Mint", () => {
              it("Should assign the initial supply of TrustCoin to the deployer", async () => {
                  const deployerBalance = (await trustCoin.balanceOf(deployer)).toString()
                  expect(deployerBalance).to.equal((initialSupply * multipler).toString())
              })
          })
          describe("transfers", async () => {
              it("should be able to transfer tokens successfully to an address", async () => {
                  const tokensToSend = ethers.parseEther("1")
                  await trustCoin.transfer(user1, tokensToSend)
                  expect(await trustCoin.balanceOf(user1)).to.equal(tokensToSend)
              })
              it("emits an transfer event, when an transfer occurs", async () => {
                  await expect(trustCoin.transfer(user1, ethers.parseEther("1"))).to.emit(
                      trustCoin,
                      "Transfer"
                  )
              })
          })
          describe("allowances", async () => {
              const amount = (1 * multipler).toString()
              beforeEach(async () => {
                  playerToken = await ethers.getContract("TrustCoin", user2)
              })
              it("should approve other address to spend token", async () => {
                  const tokensToSpend = ethers.parseEther("5")
                  // Deployer is approving that user2 can spend 5 of their precious tokens
                  await trustCoin.approve(user2, tokensToSpend)
                  await playerToken.transferFrom(deployer, user2, tokensToSpend)
                  expect(await playerToken.balanceOf(user2)).to.equal(tokensToSpend)
              })
              it("doesn't allow an unnaproved member to do transfers", async () => {
                  await expect(
                      playerToken.transferFrom(deployer, user2, amount)
                  ).to.be.rejectedWith("ERC20: insufficient allowance")
              })
              it("emits an approval event, when an approval occurs", async () => {
                  await expect(trustCoin.approve(user2, amount)).to.emit(trustCoin, "Approval")
              })
              it("the allowance being set is accurate", async () => {
                  await trustCoin.approve(user2, amount)
                  expect(await trustCoin.allowance(deployer, user2)).to.equal(amount)
              })
              it("won't allow a user to spend more than the approved amount", async () => {
                  await trustCoin.approve(user2, amount)
                  await expect(
                      playerToken.transferFrom(deployer, user2, (2 * multipler).toString())
                  ).to.be.rejectedWith("ERC20: insufficient allowance")
              })
          })
      })
