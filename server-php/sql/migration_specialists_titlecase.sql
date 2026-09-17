-- Normalizar especialistas existentes a Title Case
-- Ejecutar UNA sola vez tras desplegar el endpoint con toTitleCase()

SET NAMES utf8mb4;

-- Función auxiliar idéntica a toTitleCase() en PHP
DROP FUNCTION IF EXISTS to_title_case;
DELIMITER //
CREATE FUNCTION to_title_case(p VARCHAR(255)) RETURNS VARCHAR(255) DETERMINISTIC NO SQL
BEGIN
    DECLARE s VARCHAR(255) DEFAULT TRIM(p);
    DECLARE result VARCHAR(255) DEFAULT '';
    DECLARE word VARCHAR(255);
    DECLARE pos INT DEFAULT 1;
    DECLARE len INT DEFAULT CHAR_LENGTH(s);
    DECLARE in_word BOOLEAN DEFAULT FALSE;
    DECLARE word_start INT DEFAULT 1;
    DECLARE i INT DEFAULT 1;

    -- Colapsar espacios múltiples (simple: REPLACE doble espacio -> simple, repetir)
    SET s = REPLACE(s, '  ', ' ');
    SET s = REPLACE(s, '  ', ' ');
    SET s = REPLACE(s, '  ', ' ');

    WHILE i <= len DO
        IF SUBSTRING(s, i, 1) = ' ' THEN
            IF in_word THEN
                SET word = SUBSTRING(s, word_start, i - word_start);
                SET result = CONCAT(result, UPPER(SUBSTRING(word, 1, 1)), LOWER(SUBSTRING(word, 2)), ' ');
                SET in_word = FALSE;
            END IF;
        ELSE
            IF NOT in_word THEN
                SET word_start = i;
                SET in_word = TRUE;
            END IF;
        END IF;
        SET i = i + 1;
    END WHILE;

    IF in_word THEN
        SET word = SUBSTRING(s, word_start);
        SET result = CONCAT(result, UPPER(SUBSTRING(word, 1, 1)), LOWER(SUBSTRING(word, 2)));
    ELSE
        SET result = TRIM(TRAILING ' ' FROM result);
    END IF;

    RETURN result;
END//
DELIMITER ;

-- Actualizar filas que no estén ya en Title Case
UPDATE specialist_catalog
SET name = to_title_case(name)
WHERE name <> to_title_case(name);

-- Verificación
SELECT CONCAT('Actualizados: ', ROW_COUNT()) AS msg;
SELECT id, name FROM specialist_catalog ORDER BY name;

DROP FUNCTION to_title_case;