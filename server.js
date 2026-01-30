console.log("### BENIM SERVER DOSYAM CALISIYOR ###");



const express = require("express");
const sql = require("mssql/msnodesqlv8");

const app = express();
app.use(express.json());
app.use(express.static("public"));
// SERVER
app.listen(3000, () => {
  console.log("Server 3000 portunda çalışıyor");
});


const config = {
  driver: "msnodesqlv8",
  connectionString://
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

    //  SADECE BU SINAVIN CEVAPLARINI AL
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

    //  SONUCU HESAPLADIKTAN SONRA TEMİZLE
    await sql.query`
      DELETE FROM StudentAnswer
      WHERE exam_id = ${exam_id}
        AND student_id = ${student_id}
    `;

    res.json({
      exam_id,
      student_id,
      correct: stats.correct_count || 0,
      wrong: stats.wrong_count || 0,
      score: (stats.correct_count || 0) * 20
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/answer", async (req, res) => {
  try {
    const { student_id, exam_id, question_id, selected_option } = req.body;

    // doğru cevabı bul
    const correctResult = await sql.query`
      SELECT correct_option
      FROM Question
      WHERE question_id = ${question_id}
    `;

    const correct_option = correctResult.recordset[0].correct_option;
    const is_correct = selected_option === correct_option ? 1 : 0;

    //  daha önce cevap var mı?
    const exists = await sql.query`
      SELECT 1 FROM StudentAnswer
      WHERE student_id = ${student_id}
        AND exam_id = ${exam_id}
        AND question_id = ${question_id}
    `;

    if (exists.recordset.length > 0) {
      //  UPDATE
      await sql.query`
        UPDATE StudentAnswer
        SET selected_option = ${selected_option},
            is_correct = ${is_correct}
        WHERE student_id = ${student_id}
          AND exam_id = ${exam_id}
          AND question_id = ${question_id}
      `;
    } else {
      //  INSERT
      await sql.query`
        INSERT INTO StudentAnswer
        (student_id, exam_id, question_id, selected_option, is_correct)
        VALUES
        (${student_id}, ${exam_id}, ${question_id}, ${selected_option}, ${is_correct})
      `;
    }

    res.json({ message: "Cevap kaydedildi" });

  } catch (err) {
    console.error(" ANSWER HATASI:", err);
    res.status(500).json({ error: err.message });
  }
});


