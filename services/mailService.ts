import { badImplementation } from "@hapi/boom";
import nodemailer from "nodemailer";

export const sendMail = async (to: string, subject: string, html: string) => {
	const transporter = nodemailer.createTransport({
		host: "sandbox.smtp.mailtrap.io",
		port: 2525,
		secure: false, // use SSL
		auth: {
			user: Bun.env.MAILTRAP_USERNAME,
			pass: Bun.env.MAILTRAP_PASSWORD,
		},
	});

	const mailOptions = {
		from: Bun.env.EMAIL_USER,
		to,
		subject,
		html,
	};

	return transporter.sendMail(mailOptions, (err, info) => {
		if (err) {
			console.error(err);
			// throw error with @hapi/boom
			throw badImplementation("Error sending email!");
		}
		console.log(`Email sent: ${info.response}`);
	});
};
