# RIT.Alert Client

Программа для выполнения команд или отправки уведомлений при событиях с RIT.Alert Server.

Примеры команд:

- AutoHotKey script (Windows)
- wmctrl (Linux, X11)
- wlrctl (Linux, Wayland)

## Установка

Требования: Node.js >= 23 или >=22.6.0 c флагом `--experimental-strip-types`

```bash
git clone https://github.com/k257588376/rit-alert-client.git
cd rit-alert-client

npm install --global corepack@latest
corepack enable
pnpm i

pnpm start
```

### Автозагрузка

#### Windows

Для доступа с оконному менеджеру программу следует запускать от имени текущего пользователя

1. Нажмите сочетание клавиш Win+R, напишите команду: `shell:startup`,
   нажмите Enter (или перейдите вручную в папку `%AppData%/Microsoft/Windows/Главное меню/Программы/Автозагрузка`)
2. Создайте ярлык к `"C:\Program Files\PowerShell\7\pwsh.exe" "<путь к проекту>\start.ps1"`

Вывод программы можно увидеть в файле `output.log` в папке с проектом.

Завершить процесс можно через Диспетчер задач по PID процесса, который можно найти в логах.

#### Linux

TODO

## Конфигурация

После запуска приложения, перейдите на http://localhost:4579/ . По этому адресу можно редактировать файл конфигурации в формате JSONC (JSON with Comments) прямо из браузера. Данный файл храниться по адресу `<домашняя директория>/ritalert.jsonc`. При изменении вручную програму следует перезапустить.

- Сочетание клавиш для комментирования выделения: Сtrl+/. 
- Чтобы сохранить конфигурацию: Ctrl+S. 
- Чтобы открыть список возможных полей: Ctrl+Space

### Примеры конфигураций

#### Windows

```jsonc
{
  "enabled": true,
  "serverUrl": "http://skud.rit:8787",
  "notifications": [
    // Показывать уведомление, если выполняется одно из:
    {
      "name": "105",
      // если в событии присутствуют теги:
      "tags": ["105", "enterSide"]
    },
    {
      "name": "example1",
      // если MongoDB-like фильтр выполняется:
      "filter": {
        "user.lastName": "Тестов"
      }
    },
    {
      "name": "example2",
      // Условия можно совмещать, результат - логическое И между ними. 
      // Различие в том, что скорость сравнения тегов выше, чем выполнение фильтра
      "tags": ["entrance", "enterSide"],
      "filter": {
        "user.lastName": "Казаровец"
      }
    }
  ],
  "commands": [
    {
      "name": "105",
      "tags": ["105", "enterSide", "officer"],
      // замените %LocalAppData% полным путем
      "file": "%LocalAppData%\\Programs\\AutoHotkey\\v2\\AutoHotkey64.exe", 
      "args": ["<путь к проекту>\\ahk\\Switch.ahk"]
    }
  ]
}
```

#### Linux, X11

```jsonc
{
  "enabled": true,
  "serverUrl": "http://skud.rit:8787",
  "notifications": [/*...*/],
  "commands": [
    {
      "name": "105",
      "tags": ["105", "enterSide", "officer"],
      "file": "wmctrl",
      "args": ["-a", "Visual Studio Code"],
    },
  ],
}
```

#### Linux, Wayland
```jsonc
{
  "enabled": true,
  "serverUrl": "http://skud.rit:8787",
  "notifications": [/*...*/],
  "commands": [
    {
      "name": "105",
      "tags": ["105", "enterSide", "officer"],
      "file": "wlrctl",
      "args": ["window", "focus", "firefox"],
    },
  ],
}
```

### Другие настройки 

- `showConfigOnStartup` - показывать уведомление с конфигурацией программы при запуске
- `windowsIsScreenLockedCheckInterval` - интервал в миллисекундах вызова функции проверки, заблокирован ли экран на Windows.

### Другие эндпоинты

- GET http://localhost:4579/tester - эмулировать событие для тестирования
- POST http://localhost:4579/config/enabled - включить/отключить программу отправив в теле запроса `true` или `false`

### Пример интеграции с AutoHotKey для отключения / включения по сочетанию клавиш глобально

- Приостановить прослуживание событий: Ctrl+Shift+Alt+Z
- Возобновить прослуживание событий: Ctrl+Shift+Alt+X

При нажатии будет появляться окно-подтверждение выполненого действия, которое исчезает через секунду.

```ahk
EditConfig(value) {
  ; https://learn.microsoft.com/en-us/windows/win32/winhttp/winhttprequest
  web := ComObject('WinHttp.WinHttpRequest.5.1')
  web.Open('POST', 'http://localhost:4579/config/enabled')
  web.Send(value)
  web.WaitForResponse()
  if web.Status != 200 {
      MsgBox web.ResponseText
      return
  }  

  if value == 'true' {
      MsgBox 'Enabled', 'Config', "OK T1"
  }
  else {
      MsgBox 'Disabled', 'Config', "OK T1"
  }
}


!^+Z::EditConfig('false')
!^+X::EditConfig('true')
```

## Contribution

Проект родился с мыслью "А что если попробовать использовать реактивность Vue на сервере в Node.js?". Ответ содержится в исходном коде, начиная с [`src/index.ts`](https://github.com/k257588376/rit-alert-client/blob/main/src/index.ts)

- Так как в Windows нет команды, которая красиво показывает Toast Notification с приемлемой скоростью, пришлось написать PowerShell скрипт, который читает stdin и отправляет его с использованием user32.dll
- Чтобы не отправлять сообщения, когда пользователь заблокировал экран или сменил учетную запись, был написан хук для отслеживания подобного состояния. При этих условиях подписка на события останавливается. Так как нельзя подписаться на состояние заблокированного экрана, программа с определенным интервалом чекает его.
- Чтобы отредактировать конфигурацию через браузер, необходим интернет для загрузки редактора (подключение к [esm.sh](https://esm.sh/))