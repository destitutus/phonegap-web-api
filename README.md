phonegap-web-api
================

Node JS API for integrate Codio.com with PhoneGap

## REQUESTS

#### /me/:key

Get user information by authentication token

- `key` - A String with PhoneGap authentication token

Input:

```bash
curl localhost:1200/me/onEjRpxyaVwujA5xfyFa1
```

Output:

```json
{"code":1,"result":{"link":"/api/v1/me","username":null,"email":"didrive@mail.ru","keys":{"link":"api/v1/keys","ios":{"link":"/api/v1/keys/ios","all":[{"link":"/api/v1/keys/ios/173653","title":"Dmitrii","default":true,"id":173653}]},"android":{"link":"/api/v1/keys/android","all":[{"link":"/api/v1/keys/android/54309","title":"test","default":false,"id":54309},{"link":"/api/v1/keys/android/55493","title":"123qweASD","default":false,"id":55493}]},"blackberry":{"link":"/api/v1/keys/blackberry","all":[]}},"id":481645,"apps":{"link":"/api/v1/apps","all":[{"link":"/api/v1/apps/903742","title":"Application name","id":903742,"role":"owner"}]}}}
```

#### /init/:user/:project

Init file structure for mobile application

- `user` - A String with user name
- `project` - A String with project name

Input:

```bash
curl localhost:1200/init/user/project
```

Output:

```json
{"code":1,"result": true}
```

#### /info/:user/:project/:uid

Get information about phonegap application

- `user` - A String with user name
- `project` - A String with project name
- `uid` - A String with current use uid

Input:

```bash
curl localhost:1200/info/user/project/uid
```

Output:

```json
{"code":1, "result":{"status":{"webos":"skip","symbian":"skip","winphone":"complete","ios":"complete","android":"error","blackberry":"skip"},"hydrates":false,"build_count":2,"description":"Application description","link":"/api/v1/apps/903742","icon":{"link":"/api/v1/apps/903742/icon","filename":"icon-114x114.png"},"title":"Application name","repo":null,"debug":true,"package":"com.username.projectname","keys":{"ios":{"link":"/api/v1/keys/ios/173653","title":"Dmitrii","default":true,"id":173653},"android":{"link":"/api/v1/keys/android/54309","title":"test","default":false,"id":54309},"blackberry":null},"private":false,"error":{"android":"Keystore was tampered with, or password was incorrect"},"collaborators":{"link":"/api/v1/apps/903742/collaborators","pending":[],"active":[{"link":"/api/v1/apps/903742/collaborators/877160","person":"didrive@mail.ru","id":877160,"role":"admin"}]},"version":"0.0.1","id":903742,"download":{"winphone":"/api/v1/apps/903742/winphone","ios":"/api/v1/apps/903742/ios"},"phonegap_version":"3.3.0","role":"admin"}}
```

#### /build/:user/:project/:uid/:key

Build phonegap application

- `user` - A String with user name
- `project` - A String with project name
- `uid` - A String with current use uid
- `key` - A String with PhoneGap authentication token

Input:

```bash
curl -X POST -d '{}' localhost:1200/info/user/project/uid/key
```

Output:

```json
{"code":1, "result":{"status":{"webos":"skip","symbian":"skip","winphone":"complete","ios":"complete","android":"error","blackberry":"skip"},"hydrates":false,"build_count":2,"description":"Application description","link":"/api/v1/apps/903742","icon":{"link":"/api/v1/apps/903742/icon","filename":"icon-114x114.png"},"title":"Application name","repo":null,"debug":true,"package":"com.username.projectname","keys":{"ios":{"link":"/api/v1/keys/ios/173653","title":"Dmitrii","default":true,"id":173653},"android":{"link":"/api/v1/keys/android/54309","title":"test","default":false,"id":54309},"blackberry":null},"private":false,"error":{"android":"Keystore was tampered with, or password was incorrect"},"collaborators":{"link":"/api/v1/apps/903742/collaborators","pending":[],"active":[{"link":"/api/v1/apps/903742/collaborators/877160","person":"didrive@mail.ru","id":877160,"role":"admin"}]},"version":"0.0.1","id":903742,"download":{"winphone":"/api/v1/apps/903742/winphone","ios":"/api/v1/apps/903742/ios"},"phonegap_version":"3.3.0","role":"admin"}}
```