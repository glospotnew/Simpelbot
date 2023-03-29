import fetch from 'node-fetch'

export default async function youtubedlv2(url) {
  const response = await fetch('https://yt5s.com/en32', {
    method: 'GET',
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
      cookie: '__cflb=04dToSoFRg9oqH9pYF2En9gKJK4fe8D9TcYtUD6tYu; _ga=GA1.2.1350132744.1641709803; _gid=GA1.2.1492233267.1641709803; _gat_gtag_UA_122831834_4=1',
    }
  });
  const html = await response.text();
  const urlAjax = (/k_url_search="(.*?)"/.exec(html) || ['', ''])[1];
  const urlConvert = (/k_url_convert="(.*?)"/.exec(html) || ['', ''])[1];
  const params = {
    q: url,
    vt: 'home'
  };
  const ajaxResponse = await fetch(urlAjax, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'origin': 'https://yt5s.com',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
      'cookie': '__cflb=04dToSoFRg9oqH9pYF2En9gKJK4fe8D9TcYtUD6tYu; _ga=GA1.2.1350132744.1641709803; _gid=GA1.2.1492233267.1641709803; _gat_gtag_UA_122831834_4=1',
    },
    body: new URLSearchParams(Object.entries(params))
  });
  // let ajaxStatus = {
  //   status: ajaxResponse.status,
  //   statusText: ajaxResponse.statusText
  // }
  // if (ajaxResponse.status !== 200) return ajaxStatus;
  const json = await ajaxResponse.json();
  if (!json.links) return {
    status: false,
    statusText: json.mess,
  }
  const video = {};
  Object.values(json.links.mp4).forEach(({ k, size }) => {
    video[k] = {
      quality: k,
      fileSizeH: size,
      fileSize: parseFloat(size) * (/MB$/.test(size) ? 1000 : 1),
      download: convertv2.bind(null, urlConvert, json.vid, 'mp4', k, json.token, parseInt(json.timeExpires), json.fn)
    };
  });
  const audio = {};
  Object.values(json.links.mp3).forEach(({ key, size }) => {
    audio[key] = {
      quality: key,
      fileSizeH: size,
      fileSize: parseFloat(size) * (/MB$/.test(size) ? 1000 : 1),
      download: convertv2.bind(null, urlConvert, json.vid, 'mp3', key.replace(/kbps/i, ''), json.token, parseInt(json.timeExpires), json.fn)
    };
  });
  const res = {
    status: true,
    statusText: json.mess,
    id: json.vid,
    title: json.title,
    thumbnail: `https://i.ytimg.com/vi/${json.vid}/0.jpg`,
    video,
    audio
  };
  return res;
}

async function convertv2(url, v_id, ftype, fquality, token, timeExpire, fname) {
  try {
    const params = {
      v_id,
      ftype,
      fquality,
      token,
      timeExpire,
      client: 'yt5s.com'
    };

    const resServer = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        origin: 'https://yt5s.com',
        referer: 'https://yt5s.com/',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
        'X-Requested-Key': 'de0cfuirtgf67a'
      },
      body: new URLSearchParams(params)
    });

    const resServerJson = await resServer.json();
    const server = resServerJson.c_server;

    if (!server && ftype === 'mp3') {
      return server || resServerJson.d_url || '';
    }

    const payload = {
      v_id,
      ftype,
      fquality,
      fname,
      token,
      timeExpire
    };

    const results = await fetch(`${server}/api/json/convert`, {
      method: 'POST',
      body: new URLSearchParams(payload)
    });

    const resultsJson = await results.json();

    if (resultsJson.statusCode === 200) {
      return resultsJson.result;
    } else if (resultsJson.statusCode === 300) {
      const WebSocket = (await import('ws')).default;
      const Url = new URL(server);
      const WSUrl = `${/https/i.test(Url.protocol) ? 'wss:' : 'ws:'}//${Url.host}/sub/${resultsJson.jobId}?fname=yt5s.com`;

      const ws = new WebSocket(WSUrl, undefined, {
        headers: {
          'Accept-Encoding': 'gzip, deflate, br',
          Host: Url.host,
          Origin: 'https://yt5s.com',
          'Sec-WebSocket-Extensions': 'permessage-deflate; client_max_window_bits',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
        }
      });

      return new Promise((resolve, reject) => {
        ws.on('message', function incoming(message) {
          const msg = JSON.parse(message.toString());
          if (msg.action === 'success') {
            try {
              ws.close();
            } catch (e) {
              console.error(e);
            }
            ws.removeAllListeners('message');
            resolve(msg.url);
          } else if (msg.action === 'error') {
            reject(msg);
          }
        });
      });
    } else {
      console.log(resultsJson);
    }
  } catch (error) {
    console.error(error);
  }
}