import nodemailer from "nodemailer";

export async function POST(req: Request) {
    const {message, subject, email} = await req.json();
    if (!email || !subject || !message) {
        return new Response("Email, subject and message are required", { status: 400 });  
    }
    try{
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_SERVER_HOST!,
            port: Number(process.env.EMAIL_SERVER_PORT),
            auth: {
              user: process.env.EMAIL_SERVER_USER,
              pass: process.env.EMAIL_SERVER_PASSWORD,
            },
          });
          await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: email,
            subject: subject,
            text: message,
          });
          return new Response("Email sent successfully", { status: 200 });
    }catch(error){
        return new Response("Error sending email", { status: 500 });
    }
}