const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("TrustyCoinSale", () => {
          let trustyCoinSale, trustyCoin, initialSupply, deployer, user1, chai, assert, expect
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

              trustyCoinSale = await ethers.getContract("TrustyCoinSale", deployer)
              trustyCoin = await ethers.getContract("TrustyCoin", deployer)
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
          })
      })
