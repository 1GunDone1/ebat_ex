CREATE TABLE "Продукт" (
    "Код" INTEGER PRIMARY KEY AUTOINCREMENT,
    "Название" TEXT NOT NULL
);

CREATE TABLE "Материал" (
    "Код" INTEGER PRIMARY KEY AUTOINCREMENT,
    "Название" TEXT NOT NULL,
    "Стоимость" INTEGER
);

CREATE TABLE "ПродуктМатериал" (
    "ПродуктКод" INTEGER,
    "МатериалКод" INTEGER,
    "Код" INTEGER PRIMARY KEY AUTOINCREMENT,
    "Количество" INTEGER NOT NULL,
    CONSTRAINT "ПродуктЦех_Продукт_FK" FOREIGN KEY ("ПродуктКод") REFERENCES "Продукт"("Код"),
    CONSTRAINT "ПродуктЦех_Материал_FK" FOREIGN KEY ("МатериалКод") REFERENCES "Материал"("Код")
);