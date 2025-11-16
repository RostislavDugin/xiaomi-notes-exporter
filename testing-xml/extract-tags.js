const fs = require('fs');

// Чтение и разбор файла notes.json
const notesData = JSON.parse(fs.readFileSync('notes.json', 'utf8'));

// Регулярное выражение для поиска XML тегов
const tagRegex = /<([a-zA-Z][a-zA-Z0-9\-]*)(?:\s+[^>]*)?\/?>/g;

// Объект для хранения информации о тегах
const tagsInfo = {};

// Обработка каждой заметки
notesData.notes.forEach(note => {
    const content = note.content;
    if (typeof content !== 'string') return;

    const uniqueTags = new Set();
    let match;

    // Поиск всех уникальных тегов в содержимом
    while ((match = tagRegex.exec(content)) !== null) {
        uniqueTags.add(match[1]);
    }

    // Обновление информации о каждом найденном теге
    uniqueTags.forEach(tagName => {
        if (!tagsInfo[tagName]) {
            tagsInfo[tagName] = {
                name: tagName,
                count: 0,
                examples: []
            };
        }

        tagsInfo[tagName].count++;

        if (tagsInfo[tagName].examples.length < 3) {
            tagsInfo[tagName].examples.push(content);
        }
    });
});

// Преобразование в массив и сортировка
const sortedTags = Object.values(tagsInfo)
    .sort((a, b) => b.count - a.count);

// Запись результата в файл
fs.writeFileSync('tags.json', JSON.stringify({
    tags: sortedTags
}, null, 2));

console.log('Анализ тегов завершен. Результат сохранен в tags.json');