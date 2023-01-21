
export default function(hljs) {
    const KEYWORDS = [
        "SCHRITT",
        "LINKS-WENDUNG",
        "AUFHEBEN",
        "PLATZIEREN",
        "WENN",
        "IST",
        "NICHT",
        "SOLANGE",
        "WIEDERHOLE",
        "-MAL",
        "ENDE",
        "SONST",
        "HAUS",
        "NORDEN",
        "OSTEN",
        "SÜDEN",
        "WESTEN",
        "WAND"
    ];

    return {
        name: 'KAREL',
        case_insensitive: true,
        illegal: '^\.',
        // Support explicitly typed variables that end with $%! or #.
        keywords: {
            $pattern: '[a-zA-Z][a-zA-Z0-9_$%!#]*',
            keyword: KEYWORDS
        },
        contains: [
            hljs.QUOTE_STRING_MODE,
            {
                // Match line numbers
                className: 'symbol',
                begin: '^[0-9]+ ',
                relevance: 10
            },
            {
                // Match typed numeric constants (1000, 12.34!, 1.2e5, 1.5#, 1.2D2)
                className: 'number',
                begin: '\\b\\d+(\\.\\d+)?([edED]\\d+)?[#\!]?',
                relevance: 0
            },
            {
                // Match hexadecimal numbers (&Hxxxx)
                className: 'number',
                begin: '(&[hH][0-9a-fA-F]{1,4})'
            },
            {
                // Match octal numbers (&Oxxxxxx)
                className: 'number',
                begin: '(&[oO][0-7]{1,6})'
            }
        ]
    };
}
