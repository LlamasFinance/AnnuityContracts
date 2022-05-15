import { task } from "hardhat/config";

export default task("deploy", "Deploys the contracts").setAction(
  async (taskArgs, hre) => {
    await hre.run("run", ["./scripts/deploy.ts", ...taskArgs]);
  }
);
