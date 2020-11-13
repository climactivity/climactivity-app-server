# climactivity app server 

## Projektziele

(TODO insert a short description of the seminar here)

## Architektur

Die Software ist in eine serverseitige Nodejs Applikation und eine clientseitige Vue.js Web-Anwendung aufgeteilt. Die Web-Anwendung beinhaltet alle UI-Elemente, während die Serverapplikation die vollständige Logik enthält. Web-App und Server kommunizieren über eine REST-API. Die Software wird über einen Anwendungsserver bereitgestellt, welcher die Web-App an die Clients ausliefert und als Gateway für die Server-App auftritt. Dieser stellt dabei auch die Transportsicherheit her.

## Dieses Repository

Dieses Repository enthält die serverseitige Applikation.

### Erste Schritte

Um dieses Projekt in einer Entwicklungsumgebung auszuführen:

1. Run `npm install`
2. Setup database settings inside `ormconfig.json` file
3. Run `npm run start`

Um mit einer grafischen Benutzterschnittstelle mit der Anwendung zu interagieren wird außerdem noch die Webapp benötigt. Wie diese funktioniert steht im Readme des pwa-Repository. Damit die API korrekt mit dem Server kommuniziert, sollten beide über den selben Port erreichbar sein. Dafür bietet es sich an, lokal einen Webserver einzurichten. Hier eine Beispiel-Konfiguration für nginx:

````
server {
    listen 443 ssl;
    proxy_ssl_server_name on;
    ssl_certificate /usr/local/var/ssl/server.crt ;
    ssl_certificate_key /usr/local/var/ssl/server.key ;
    ssl_protocols        SSLv3 TLSv1;
    ssl_ciphers HIGH:!aNULL:!MD5;

    server_name 127.0.0.1:443;

    location /api { # Backend
        proxy_pass  http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / { # dev Server Frontend
        proxy_pass  http://localhost:9000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    return 301 https://$host$request_uri;
}
````

Es empfiehlt sich, ein lokales 'snake-oil' SSL Zertifikat einhzurichten, da sonst die Webapp ihren Service-Worker nicht installieren kann und der P Teil der PWA nicht getestet werden kann.

### Einen production-ready Server einrichten

In einer Produktionsumgehbung sollte der node server nicht direkt per `npm run start` ausgeführt werden, da dieser bei einem Fehler nicht automatisch neu gestartet wird. Stattdessen verwenden wir einen Prozess Manager: `pm2`. Dieser überwacht den Server-Prozess und startet diesen nach Fehlern oder Systemneustarts.

Das Fronend sollte statisch gebaut werden, statt über einen Dev Server zu laufen, damit dieses vom Applicationserver gecached werden kann. Die nginx konfig ändert sich damit zu

````
    location / { # statisches Frontend
        root /path/to/frontend
    }
````

