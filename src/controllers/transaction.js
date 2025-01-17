const {
  user,
  cart,
  book,
  transaction,
  purchasedBook,
  profile,
} = require("../../models");

const midtransClient = require('midtrans-client');

exports.getTransactions = async (req, res) => {
  try {
    let trx = await transaction.findAll({
      attributes: {
        exclude: ["createdAt", "updatedAt"],
      },
    });

    res.send({
      status: "Success",
      trx,
    });
  } catch (error) {
    console.log(error);
    res.send({
      status: "Failed",
      message: "Get All Transaction Error",
    });
  }
};

// Add Transaction
exports.addTransaction = async (req, res) => {
  try {
    let dataUser = req.user;

    let listCart = await cart.findAll({
      where: {
        idUser: dataUser.id,
      },
      include: [
        {
          model: book,
          as: "book",
          attributes: {
            exclude: ["createdAt", "updatedAt"],
          },
        },
      ],
    });

    if (listCart.length == 0) {
      return res.send({
        message: "Cart is Empty!",
      });
    }

    let listProducts = listCart.map((item) => {
      return item.book.title;
    });

    let prices = listCart
      .map((item) => {
        return item.total;
      })
      .reduce((a, b) => a + b, 0);

    let data = {
      id: parseInt(Math.random().toString().slice(3, 8)),
      nameBuyer: dataUser.name,
      products: listProducts.join(", "),
      total: prices,
      status: "pending",
      idUser: dataUser.id,
    };

    let pushTrx = await transaction.create(data);

    const buyerData = await user.findOne({
      include: {
        model: profile,
        as: 'profile',
        attributes: {
          exclude: ['createdAt', 'updatedAt', 'idUser'],
        },
      },
      where: {
        id: pushTrx.idUser,
      },
      attributes: {
        exclude: ['createdAt', 'updatedAt', 'password'],
      },
    });

    let snap = new midtransClient.Snap({
      isProduction: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY,
    });

    let parameter = {
      transaction_details: {
        order_id: pushTrx.id,
        gross_amount: pushTrx.total,
      },
      credit_card: {
        secure: true,
      },
      customer_details: {
        full_name: buyerData?.name,
        email: buyerData?.email,
        phone: buyerData?.profile?.phone,
      },
    };

    const payment = await snap.createTransaction(parameter);

    let purBookData = await listCart.map((item) => {
      return purchasedBook.create({
        idUser: dataUser.id,
        idBook: item.book.id,
      });
    });

    await cart.destroy({
      where: {
        idUser: dataUser.id,
      },
    });

    res.send({
      status: 'pending',
      message: 'Pending transaction payment gateway',
      payment,
    });
  } catch (error) {
    console.log(error);
    res.send({
      status: "Failed",
      message: "Add Transaction Error",
    });
  }
};

const MIDTRANS_CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY;
const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;

const core = new midtransClient.CoreApi();

core.apiConfig.set({
  isProduction: false,
  serverKey: MIDTRANS_SERVER_KEY,
  clientKey: MIDTRANS_CLIENT_KEY,
});


exports.notification = async (req, res) => {
  try {
    const statusResponse = await core.transaction.notification(req.body);

    console.log("------- Notification --------- ✅");
    console.log(statusResponse);

    const orderId = statusResponse.order_id;
    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus = statusResponse.fraud_status;

    if (transactionStatus == "capture") {
      if (fraudStatus == "challenge") {
        // TODO set transaction status on your database to 'challenge'
        // and response with 200 OK
        sendEmail("pending", orderId); //sendEmail with status pending and order id
        updateTransaction("pending", orderId);
        res.status(200);
      } else if (fraudStatus == "accept") {
        // TODO set transaction status on your database to 'success'
        // and response with 200 OK
        sendEmail("success", orderId); //sendEmail with status pending and order id
        updateProduct(orderId);
        updateTransaction("success", orderId);
        res.status(200);
      }
    } else if (transactionStatus == "settlement") {
      // TODO set transaction status on your database to 'success'
      // and response with 200 OK
      sendEmail("success", orderId); //sendEmail with status pending and order id
      updateProduct(orderId);
      updateTransaction("success", orderId);
      res.status(200);
    } else if (
      transactionStatus == "cancel" ||
      transactionStatus == "deny" ||
      transactionStatus == "expire"
    ) {
      // TODO set transaction status on your database to 'failure'
      // and response with 200 OK
      sendEmail("failed", orderId); //sendEmail with status pending and order id
      updateTransaction("failed", orderId);
      res.status(200);
    } else if (transactionStatus == "pending") {
      // TODO set transaction status on your database to 'pending' / waiting payment
      // and response with 200 OK
      sendEmail("pending", orderId); //sendEmail with status pending and order id
      updateTransaction("pending", orderId);
      res.status(200);
    }
  } catch (error) {
    console.log(error);
    res.status(500);
  }
};

const updateTransaction = async (status, transactionId) => {
  await transaction.update(
    {
      status,
    },
    {
      where: {
        id: transactionId,
      },
    }
  );
};

const updateProduct = async (par1) => {
  try {
    let dataUser = await transaction.findOne({
      raw: true,
      where: {
        id: par1,
      },
    });

    let listCart = await cart.findAll({
      where: {
        idUser: dataUser.idUser,
      },
      include: [
        {
          model: book,
          as: "book",
          attributes: {
            exclude: ["createdAt", "updatedAt"],
          },
        },
      ],
    });

    //Kalau Midtrans sudah Jadi pindahkan ke Notif sampai Cart Destroy
    let purBookData = await listCart.map((item) => {
      return purchasedBook.create({
        idUser: dataUser.idUser,
        idBook: item.book.id,
      });
    });

    await cart.destroy({
      where: {
        idUser: dataUser.idUser,
      },
    });
  } catch (error) {
    console.log(error);
  }
};

const sendEmail = async (status, transactionId) => {
  // Config service and email account
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SYSTEM_EMAIL,
      pass: process.env.SYSTEM_PASSWORD,
    },
  });

  // Get transaction data
  let data = await transaction.findOne({
    where: {
      id: transactionId,
    },
    attributes: {
      exclude: ["createdAt", "updatedAt"],
    },
    include: [
      {
        model: user,
        as: "user",
        attributes: {
          exclude: ["createdAt", "updatedAt", "password"],
        },
      },
    ],
  });

  data = JSON.parse(JSON.stringify(data));

  // Email options content
  const mailOptions = {
    from: process.env.SYSTEM_EMAIL,
    to: data.user.email,
    subject: "Payment status",
    text: "Your payment is <br />" + status,
    html: `<!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="UTF-8" />
                <meta http-equiv="X-UA-Compatible" content="IE=edge" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Document</title>
                <style>
                  h1 {
                    color: brown;
                  }
                </style>
              </head>
              <body>
                <h2>Product payment :</h2>
                <ul style="list-style-type:none;">
                  <li>Name : ${data.products}</li>
                  <li>Total payment: ${data.total}</li>
                  <li>Status : <b>${status}</b></li>
                </ul>  
              </body>
            </html>`,
  };

  // Send an email if there is a change in the transaction status
  if (data.status != status) {
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) throw err;
      console.log("Email sent: " + info.response);

      return res.send({
        status: "Success",
        message: info.response,
      });
    });
  }
};
