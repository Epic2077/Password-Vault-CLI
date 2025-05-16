const fs = require("fs");
const inquirerModule = require("inquirer");
const inquirer = inquirerModule.default || inquirerModule;
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { encrypt, decrypt } = require("./encrypt");

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
const VAULT_PATH = "./vault.json";

async function init() {
  let config;
  if (!fs.existsSync(CONFIG_PATH)) {
    console.log("No master password found. Please set one up.");
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
    const encryptionKey = crypto.randomBytes(32).toString("hex");

    fs.writeFileSync(
      CONFIG_PATH,
      JSON.stringify({ master: hashed, encryptionKey })
    );
    fs.writeFileSync(VAULT_PATH, JSON.stringify({ entries: [] }, null, 2));

    config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));

    console.log("Vault initialized. Please remember your master password.");
    console.warn("This password is not recoverable. DO NOT FORGET IT.");
  } else {
    try {
      const raw = fs.readFileSync(CONFIG_PATH, "utf8");
      config = JSON.parse(raw);
    } catch (err) {
      console.error("❌ Vault config is corrupted. Re-initializing...");
      fs.unlinkSync(CONFIG_PATH);
      if (fs.existsSync(VAULT_PATH)) fs.unlinkSync(VAULT_PATH);
      return init();
    }
  }

  const { password: enteredPassword } = await inquirer.prompt({
    type: "password",
    name: "password",
    message: "Enter your master password to unlock: ",
    mask: "*",
  });

  if (!bcrypt.compareSync(enteredPassword, config.master)) {
    console.clear();
    console.log("❌ Incorrect master password.");
    process.exit(1);
  }

  console.clear();
  console.log("✅ Vault unlocked!");
  await mainMenu(config.encryptionKey);
}

async function mainMenu(encryptionKey) {
  const { action } = await inquirer.prompt({
    type: "list",
    name: "action",
    message: "Choose an action:",
    choices: ["View Passwords", "Add New Password", "Exit"],
  });

  if (action === "Add New Password") {
    console.clear();
    await addPassword(encryptionKey);
    await mainMenu(encryptionKey);
  } else if (action === "View Passwords") {
    console.clear();
    await viewPasswords(encryptionKey);
    await mainMenu(encryptionKey);
  } else {
    console.clear();
    console.log("Goodbye!");
    process.exit(0);
  }
}

async function addPassword(key) {
  const { name, password } = await inquirer.prompt([
    {
      type: "input",
      name: "name",
      message: "Enter a name for the password (e.g. GitHub):",
    },
    {
      type: "password",
      name: "password",
      message: "Enter the password:",
      mask: "*",
    },
  ]);

  const vault = JSON.parse(fs.readFileSync(VAULT_PATH, "utf8"));
  const encrypted = encrypt(password, key);
  vault.entries.push({ name, password: encrypted });
  fs.writeFileSync(VAULT_PATH, JSON.stringify(vault, null, 2));
  console.log(`✅ Password for "${name}" added.`);
}

async function viewPasswords(key) {
  const vault = JSON.parse(fs.readFileSync(VAULT_PATH, "utf8"));
  if (vault.entries.length === 0) {
    console.log("No passwords saved yet.");
    return;
  }

  const { selectedName } = await inquirer.prompt({
    type: "list",
    name: "selectedName",
    message: "Select a password to view:",
    choices: vault.entries.map((entry) => entry.name),
  });

  const selected = vault.entries.find((e) => e.name === selectedName);
  const decrypted = decrypt(selected.password, key);
  console.log(`🔑 Password for "${selectedName}": ${decrypted}`);
}

init();
