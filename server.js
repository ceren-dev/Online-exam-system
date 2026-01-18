console.log("### BENIM SERVER DOSYAM CALISIYOR ###");

const express = require("express");
const sql = require("mssql/msnodesqlv8");

const app = express();
app.use(express.json());
app.use(express.static("public"));


const config = {
  driver: "msnodesqlv8",
  connectionString:
    "Driver={ODBC Driver 18 for SQL Server};" +
    "Server=DESKTOP-QUEAH06\\SQLEXPRESS;" +
    "Database=sinavsistemi;" +
    "Trusted_Connection=Yes;" +
    "Encrypt=No;" +
    "TrustServerCertificate=Yes;"
};

// DB bağlantısı
sql.connect(config)
  .then(() => console.log("SQL Server bağlandı"))
  .catch(err => console.error("DB bağlantı hatası:", err));

// TEST
app.get("/test", (req, res) => {
  res.send("test ok");
});

// SINAV SORULARI
app.get("/exam/:id/questions", async (req, res) => {
  try {
    const exam_id = req.params.id;

    const result = await sql.query`
      SELECT 
        Q.question_id,
        Q.question_text,
        Q.option_a,
        Q.option_b,
        Q.option_c,
        Q.option_d
      FROM ExamQuestion EQ
      JOIN Question Q
        ON Q.question_id = EQ.question_id
       AND Q.version_no = EQ.question_version
      WHERE EQ.exam_id = ${exam_id}
        AND Q.is_active = 1
    `;

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
// SINAV SONUCU / PUAN HESAPLAMA
app.get("/exam/:id/result", async (req, res) => {
  try {
    const exam_id = req.params.id;
    const student_id = req.query.student_id;

    if (!student_id) {
      return res.status(400).json({ error: "student_id gerekli" });
    }

    const result = await sql.query`
      SELECT
        COUNT(*) AS total_questions,
        SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS correct_count,
        SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) AS wrong_count
      FROM StudentAnswer
      WHERE exam_id = ${exam_id}
        AND student_id = ${student_id}
    `;

    const stats = result.recordset[0];

    const score = stats.correct_count * 20; // 5 soru varsa: 20 puan/soru

    res.json({
      exam_id,
      student_id,
      total_questions: stats.total_questions,
      correct: stats.correct_count,
      wrong: stats.wrong_count,
      score
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// SERVER
app.listen(3000, () => {
  console.log("Server 3000 portunda çalışıyor");
});
