const fs = require('fs').promises;

// Функция для парсинга атрибутов тега
function parseAttributes(attrString) {
    const attrs = {};
    if (!attrString) return attrs;

    const regex = /(\w+)\s*=\s*"([^"]*)"/g;
    let match;

    while ((match = regex.exec(attrString)) !== null) {
        attrs[match[1]] = match[2];
    }

    return attrs;
}

// Функция для обработки текстового содержимого с обрезкой пробелов
function processTextContent(content) {
    return content ? content.trim() : '';
}

// Основная функция преобразования XML в Markdown
function xmlToMarkdown(text) {
    if (!text || typeof text !== 'string') return text;

    const tagHandlers = {
        // <b> - жирный шрифт
        'b': (content, attrs) => `**${processTextContent(content)}**`,

        // <background> - удаляем тег, оставляем содержимое
        'background': (content, attrs) => content,

        // <i> - курсив
        'i': (content, attrs) => `*${processTextContent(content)}*`,

        // <img> - удаляем тег, оставляем содержимое (если есть)
        'img': (content, attrs) => content,

        // <input type="checkbox"> - галочки
        'input': (content, attrs) => {
            const attributes = parseAttributes(attrs);
            if (attributes.type === 'checkbox') {
                const isChecked = attributes.checked === 'true';
                return `- [${isChecked ? 'x' : ' '}] ${processTextContent(content)}`;
            }
            return content; // оставляем содержимое для других input
        },

        // <new-format> - удаляем тег, оставляем содержимое
        'new-format': (content, attrs) => content,

        // <order> - нумерованный список
        'order': (content, attrs) => `1. ${processTextContent(content)}`,

        // <size> - заголовок
        'size': (content, attrs) => `# ${processTextContent(content)}`,

        // <text> - абзац
        'text': (content, attrs) => {
            const attributes = parseAttributes(attrs);
            return `${processTextContent(content)}\n`;
        },

        // <u> - оставляем как есть
        'u': (content, attrs) => `<u>${content}</u>`
    };

    // Регулярное выражение для поиска XML тегов
    const tagRegex = /<(\w+[-]?\w*)(?:\s+([^>]*))?(?:\/>|>(.*?)<\/\1>)/gs;

    let result = text;
    let match;

    // Обрабатываем все найденные теги
    while ((match = tagRegex.exec(text)) !== null) {
        const [fullMatch, tagName, attributes, content = ''] = match;

        if (tagHandlers[tagName]) {
            const replacement = tagHandlers[tagName](content, attributes);
            result = result.replace(fullMatch, replacement);
        } else {
            // Для неизвестных тегов удаляем только тег, оставляем содержимое
            result = result.replace(fullMatch, content);
        }
    }

    // Удаляем оставшиеся одиночные XML теги (самозакрывающиеся и без содержимого)
    // Но сохраняем текст между тегами
    result = result.replace(/<[^>]+\/>/g, ''); // самозакрывающиеся теги
    result = result.replace(/<(\w+)[^>]*>([^<]*)<\/\1>/g, '$2'); // простые теги без вложенности

    // Чистим множественные переносы строк
    result = result.replace(/\n{3,}/g, '\n\n');

    return result.trim();
}

// Основная функция
async function main() {
    try {
        // Читаем исходный файл
        const data = await fs.readFile('notes.json', 'utf8');
        const notesData = JSON.parse(data);

        // Обрабатываем каждую заметку
        const processedNotes = notesData.notes.map(note => ({
            ...note,
            content: xmlToMarkdown(note.content)
        }));

        // Создаем новый объект с обработанными данными
        const resultData = {
            ...notesData,
            notes: processedNotes
        };

        // Записываем результат в новый файл
        await fs.writeFile(
            'notes-md.json',
            JSON.stringify(resultData, null, 2),
            'utf8'
        );

        console.log('Файл notes-md.json успешно создан!');
        console.log(`Обработано заметок: ${processedNotes.length}`);

    } catch (error) {
        console.error('Произошла ошибка:', error.message);
    }
}

// Запускаем скрипт
if (require.main === module) {
    main();
}

module.exports = { xmlToMarkdown, parseAttributes };