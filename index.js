const fs = require("fs");
const inquirerModule = require("inquirer");
const inquirer = inquirerModule.default || inquirerModule;
const bcrypt = require("bcryptjs");

console.clear();
console.log(String.raw`
 _______  _______  _______  _______           _______           _    _________
(  ____ )(  ___  )(  ____ \(  ____ \|\     /|(  ___  )|\     /|( \   \__   __/
| (    )|| (   ) || (    \/| (    \/| )   ( || (   ) || )   ( || (      ) (   
| (____)|| (___) || (_____ | (_____ | |   | || (___) || |   | || |      | |   
|  _____)|  ___  |(_____  )(_____  )( (   ) )|  ___  || |   | || |      | |   
| (      | (   ) |      ) |      ) | \ \_/ / | (   ) || |   | || |      | |   
| )      | )   ( |/\____) |/\____) |  \   /  | )   ( || (___) || (____/\| |   
|/       |/     \|\_______)\_______)   \_/   |/     \|(_______)(_______/)_(   
                                                                              
                                                        `);

console.log("Welcome to the Vault CLI!");

const CONFIG_PATH = "./vault.config.json";

async function init() {
  if (!fs.existsSync(CONFIG_PATH)) {
    const { password } = await inquirer.prompt({
      type: "password",
      name: "password",
      message: "Set a master password: ",
      mask: "*",
    });

    const { confirm } = await inquirer.prompt({
      type: "password",
      name: "confirm",
      message: "Confirm your master password: ",
      mask: "*",
    });

    if (password !== confirm) {
      console.error("Passwords do not match. Please try again.");
      return init();
    }

    if (password.length < 8) {
      console.error("Password must be at least 8 characters long.");
      return init();
    }

    const { sure } = await inquirer.prompt({
      type: "confirm",
      name: "sure",
      message: `Are you sure you want to set the password to "${password}"? (y/n)`,
    });

    if (!sure) {
      console.log("Aborting...");
      return init();
    }

    const hashed = bcrypt.hashSync(password, 10);
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ master: hashed }));
    console.log("Vault initialized. Please remember your master password.");
    console.warn("This password is not recoverable. DO NOT FORGET IT.");
  }

  const { password: enteredPassword } = await inquirer.prompt({
    type: "password",
    name: "password",
    message: "Enter your master password to unlock: ",
    mask: "*",
  });

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));

  if (bcrypt.compareSync(enteredPassword, config.master)) {
    console.log("✅ Vault unlocked!");
    // Call main menu function here
  } else {
    console.log("❌ Incorrect master password.");
    process.exit(1);
  }
}

init();
