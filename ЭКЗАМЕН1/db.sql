CREATE TABLE "Продукт" (
    "Код" SERIAL PRIMARY KEY,
    "Название" TEXT NOT NULL
);

CREATE TABLE "Материал" (
    "Код" SERIAL PRIMARY KEY,
    "Название" TEXT NOT NULL,
    "Стоимость" INTEGER
);

CREATE TABLE "ПродуктМатериал" (
    "ПродуктКод" INTEGER,
    "МатериалКод" INTEGER,
    "Код" SERIAL NOT NULL PRIMARY KEY,
    "Количество" INTEGER NOT NULL,
    CONSTRAINT "ПродуктЦех_Продукт_FK" FOREIGN KEY ("ПродуктКод") REFERENCES "Продукт"("Код"),
    CONSTRAINT "ПродуктЦех_Материал_FK" FOREIGN KEY ("МатериалКод") REFERENCES "Материал"("Код")
);