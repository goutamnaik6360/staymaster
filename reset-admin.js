const fs = require("fs");
const crypto = require("crypto");

const file = "./src/data.json";
const data = JSON.parse(fs.readFileSync(file, "utf8"));

const user = data.users.find(u => u.role === "Administrator");

if (!user) {
  console.error("Administrator account not found.");
  process.exit(1);
}

const password = process.env.CAREPOINT_NEW_PASSWORD;

if (!password || password.length < 10) {
  console.error("Password must be at least 10 characters.");
  process.exit(1);
}

user.email = "manjunathshet391@gmail.com";
user.salt = crypto.randomBytes(16).toString("hex");
user.hash = crypto.scryptSync(password, user.salt, 64).toString("hex");

fs.writeFileSync(file, JSON.stringify(data, null, 2));

console.log("Administrator account updated successfully.");
console.log("Email:", user.email);
