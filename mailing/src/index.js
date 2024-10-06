const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const { convertTemplateToHtmlInline } = require("./utils/generationUtils");
const fs = require("fs");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");

dotenv.config();

const port = 5050;
const app = express();

///////////////////////////////////////////////////////////////////////// Middleware
app.use(express.json());

const corsOptions = {
  origin: ["http://localhost:3000"],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

app.use("/assets", express.static(path.join(__dirname, "assets")));
/////////////////////////////////////////////////////////////////////////

app.get("/", (req, res) => {
  res.send("server running");
});

// endpoint to get the html for emails sent from the platform
app.post("/convertTemplateToHtmlInline", async (req, res) => {
  const { templateZones, userLinks } = req.body;
  console.log(JSON.stringify(templateZones, null, 2));
  try {
    const htmlTemplate = await convertTemplateToHtmlInline(
      templateZones,
      userLinks
    );
    res.status(200).json({ html: htmlTemplate });
  } catch (error) {
    console.error("Error during HTML conversion:", error);
    res.status(500).json({
      error: `Failed to convert template to HTML: ${error.message}`,
    });
  }
});

app.get("/preview", (req, res) => {
  const filePath = path.join(__dirname, "templateInline.html");

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error("Error accessing file:", err);
      return res.status(404).json({ error: "File not found" });
    }

    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("Error sending file:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to send file" });
        }
      }
    });
  });
});

app.post("/downloadHtmlTemplate", async (req, res) => {
  const { htmlTemplate, templateTitle } = req.body;

  if (!templateTitle) {
    return res.status(400).json({ error: "Template title is required" });
  }

  const sanitizedTitle = templateTitle.replace(/\s+/g, "");
  const fileName = `${sanitizedTitle}.html`;
  const filePath = path.join(__dirname, fileName);

  try {
    await fs.promises.writeFile(filePath, htmlTemplate);

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error("Error sending file:", err);
        res.status(500).json({ error: "Failed to send file" });
      } else {
        fs.promises.unlink(filePath).catch((error) => {
          console.error("Error deleting file:", error);
        });
      }
    });
  } catch (error) {
    console.error("Error during HTML conversion:", error);
    res
      .status(500)
      .json({ error: `Failed to convert template to HTML: ${error.message}` });
  }
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAILCRAFT_GMAIL,
    pass: process.env.MAILCRAFT_GMAIL_PASSWORD,
  },
});

app.post("/sendMail", async (req, res) => {
  const { userMail, recipient, subject, htmlContent } = req.body;

  const textContent = htmlContent.replace(/<[^>]+>/g, ""); // convert HTML to plain text
  console.log(textContent);

  const mailData = {
    from: userMail,
    to: recipient,
    subject: subject,
    html: htmlContent, // HTML version
  };

  try {
    await transporter.sendMail(mailData);
    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
});

const resetPasswordURL =
  process.env.RESET_PASSWORD_URL || "localhost:3000/resetPassword";
const jwtSecret = process.env.JWT_SECRET_KEY || "temporary_reset_key";

app.post("/generateResetPasswordLink", async (req, res) => {
  const { recipient } = req.body;

  if (!recipient) {
    return res.status(400).json({ error: "Recipient email is required" });
  }

  try {
    const token = jwt.sign({ email: recipient }, jwtSecret, {
      expiresIn: "1h",
    });
    const resetLink = `${resetPasswordURL}?token=${token}`;

    const mailData = {
      from: process.env.MAILCRAFT_GMAIL,
      to: recipient,
      subject: "Réinitialisation de votre mot de passe",
      html: `<p>Vous avez demandé la réinitialisation de votre mot de passe. Veuillez cliquer sur le lien suivant pour poursuivre :</p>
             <a href="${resetLink}">Réinitialiser le mot de passe</a>`,
    };

    await transporter.sendMail(mailData);
    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
