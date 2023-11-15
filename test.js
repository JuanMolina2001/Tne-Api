const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const port = 3000;

const scrap = async (rut, numb) => {
  const browser = await puppeteer.launch({ headless: 'new' });

  const page = await browser.newPage();

  let alerta;

  page.on('dialog', async (dialog) => {
    alerta = dialog.message();
    await dialog.dismiss();
  });

  await page.goto("https://sistema.tne.cl/reposiciones/estado_tarjeta_alumno/tneEmitidas/" + rut + "/" + numb + "/0.5");

  const scriptContents = await page.evaluate(() => {
    const scriptElements = document.querySelectorAll('script');
    const secondScript = scriptElements[1];
    const thirdScript = scriptElements[2];

    const secondScriptContent = secondScript ? secondScript.textContent : null;
    const thirdScriptContent = thirdScript ? thirdScript.textContent : null;

    return { secondScriptContent, thirdScriptContent };
  });

  const script1 = scriptContents.secondScriptContent;
  const script2 = scriptContents.thirdScriptContent;

  if (alerta) {
    return null; // Devuelve null si hay una alerta
  } else {
    const Script = script1 + script2;
    let datos = Script.split(";");
    datos = datos.map((item) => item.trim());

    const regexValues = /=\s*([^;]*)/;
    let valores = datos.map((item) => {
      const match = item.match(regexValues);
      return match ? match[1].trim() : null;
    });

    valores = valores.filter((valor) => valor !== null);

    valores = valores.map((valor) => valor.replace(/["']/g, ""));
    valores.splice(8, 2);

    const keys = ["observaciones","apellido","nombre","folio_tne","periodo_tne","tipo_tne","estado_tne","lugar_oficina","nota","soli_periodo","soli_proceso","soli_fech","soli_tipo","soli_estado"];
 
    const datosObj = {};
    for (let i = 0; i < valores.length; i += 1) {
      datosObj[keys[i]] = valores[i];
    }

    await browser.close();
    return datosObj;
  }
};

app.get('/api/:rut/:numb', async (req, res) => {
  try {
    const rut = req.params.rut;
    const numb = req.params.numb;

    const result = await scrap(rut, numb);

    if (result === null) {
      res.status(400).json({ error: 'Usuario no encontrado' });
    } else {
      res.json({ user: result });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.listen(port, () => {
  console.log(`Servidor API escuchando en http://localhost:${port}`);
});
