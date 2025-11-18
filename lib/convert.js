let xmlToMarkdown = null;

(() => {
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

    function processTextContent(content) {
        return content ? content.trim() : '';
    }

    function singleToDoubleNewline(text) {
        return text.replace(/(?<!\n)\n(?!\n)/g, '\n\n');
    }

    function _xmlToMarkdown(text) {
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

        const tagRegex = /<(\w+[-]?\w*)(?:\s+([^>]*))?(?:\/>|>(.*?)<\/\1>)/gs;

        let result = text;
        let match;

        while ((match = tagRegex.exec(text)) !== null) {
            const [fullMatch, tagName, attributes, content = ''] = match;

            if (tagHandlers[tagName]) {
                const replacement = tagHandlers[tagName](content, attributes);
                result = result.replace(fullMatch, replacement);
            } else {
                result = result.replace(fullMatch, content);
            }
        }

        // Удаляем оставшиеся одиночные XML теги (самозакрывающиеся и без содержимого)
        // Но сохраняем текст между тегами
        result = result.replace(/<[^>]+\/>/g, ''); // самозакрывающиеся теги
        result = result.replace(/<(\w+)[^>]*>([^<]*)<\/\1>/g, '$2'); // простые теги без вложенности

        result = singleToDoubleNewline(result);

        return result.trim();
    }

    xmlToMarkdown = _xmlToMarkdown;
})();
