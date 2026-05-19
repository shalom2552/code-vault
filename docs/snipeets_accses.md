i want to be abkle to easely browese the snipets in my pc. add files directly or
change or delete and it all will reflect in the app with no errors or files
desapear.
as for now this all under the dir "data" and each snippet is in its own dir
(whiche is grate) but the dir names are hased names and i dont know which one is
which. i dont know what the best approach to tath since we dont realy know the
implemntation of that. we need an agent to scan this flow and implemntation in
all what it says and to find the best approach to that.
i gues we need to have a hash so if there is a duplicated names okay, but still
if we just iuse the name the name have spaces so we need to replace them with
    under score and maybe append a really short has, i dont know they probably
    know better than me, i just know what i want to happen.
here is the structure now:

$ tree data                                                                                         ─╯
 data
├──  03673715-abac-4833-8cfc-7d78079f16a9
│   ├──  main.cpp
│   └──  meta.json
├──  804e9896-4df3-4b9d-a4bc-f3e91348599e
│   ├──  main.cpp
│   └──  meta.json
├──  71146e59-cbca-4d35-8b81-454903c0504f
│   ├──  main.c
│   └──  meta.json
├──  296752b1-7e70-4adf-9e0c-4cb39451db9d
│   ├──  main.cpp
│   └──  meta.json
├──  a595ca9e-40ad-4f8a-bdce-940854886dbc
│   ├──  main.cpp
│   └──  meta.json
├──  b475de49-09b9-4af0-9570-2e0a7da9f5db
│   ├──  main.cpp
│   └──  meta.json
├──  ca667bdb-3f05-4dc8-a306-dad3bffb0f40
│   ├──  main.cpp
│   ├──  meta.json
│   ├──  sin_lut.cpp
│   └──  sin_lut.hpp
└──  daad605b-7d99-4432-9bb2-4027ebc2e0f9
    ├──  main.cpp
    ├──  meta.json
    ├──  singleton.cpp
    ├──  singleton.hpp
    └──  singleton.inl


$ cat data/03673715-abac-4833-8cfc-7d78079f16a9/meta.json                                           ─╯
{
  "id": "03673715-abac-4833-8cfc-7d78079f16a9",
  "title": "Get current time",
  "tags": [
    "Time"
  ],
  "notes": "",
  "files": [
    "main.cpp"
  ],
  "createdAt": "2026-05-15T22:47:16.117Z",
  "updatedAt": "2026-05-15T22:47:16.117Z"
}%

