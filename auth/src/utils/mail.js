import Mailgen from "mailgen";
import { Resend } from "resend";
import "dotenv/config";

const resend = new Resend(process.env.RESEND_API_KEY);

const sendMail = async (option) => {
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "filmsy",
      link: "https://filmsy.jaydipsatani.com/",
    },
  });

  const emailText = mailGenerator.generatePlaintext(option.mailGenContent);
  const emailBody = mailGenerator.generate(option.mailGenContent);

  try {
    const data = await resend.emails.send({
      from: "filmsy@jaydipsatani.com",
      to: option.email,
      subject: option.subject,
      html: emailBody,
      text: emailText,
    });
    console.log(data);
    return data;
  } catch (error) {
    console.error("Email failed to send", error);
  }
};

const emailVerificationMailGenContent = (username, verificationURL) => {
  return {
    body: {
      name: username,
      intro: "Welcome to filmsy! We're very excited to have you on board.",
      action: {
        instructions: "To get started with filmsy, please click here:",
        button: {
          color: "#22BC66",
          text: "Verify your email",
          link: verificationURL,
        },
      },
      outro:
        "Need help, or have questions? Just reply to this email, we'd love to help.",
    },
  };
};

const forgotPasswordMailGenContent = (username, passwordURL) => {
  return {
    body: {
      name: username,
      intro: "We got a request to reset your password.",
      action: {
        instructions: "To change your password, click the button below:",
        button: {
          color: "#22BC66",
          text: "Reset Password",
          link: passwordURL,
        },
      },
      outro:
        "Need help, or have questions? Just reply to this email, we'd love to help.",
    },
  };
};

export {
  emailVerificationMailGenContent,
  forgotPasswordMailGenContent,
  sendMail,
};
