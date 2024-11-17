const fs = require('fs').promises;
const path = require('path');
const https = require('https');

const VENDOR_DIR = path.join(__dirname, '../vendor');
const HIGHLIGHT_DIR = path.join(VENDOR_DIR, 'highlight');
const STYLES_DIR = path.join(HIGHLIGHT_DIR, 'styles');
const LANGUAGES_DIR = path.join(HIGHLIGHT_DIR, 'languages');

// 创建必要的目录
async function createDirs() {
    await fs.mkdir(VENDOR_DIR, { recursive: true });
    await fs.mkdir(HIGHLIGHT_DIR, { recursive: true });
    await fs.mkdir(STYLES_DIR, { recursive: true });
    await fs.mkdir(LANGUAGES_DIR, { recursive: true });
    await fs.mkdir(path.join(VENDOR_DIR, 'fonts'), { recursive: true });
}

// 下载文件的函数
function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        https.get(url, response => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                // 处理重定向
                downloadFile(response.headers.location, dest).then(resolve).catch(reject);
                return;
            }
            
            const file = fs.createWriteStream(dest);
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                resolve();
            });
            
            file.on('error', err => {
                fs.unlink(dest);
                reject(err);
            });
        }).on('error', reject);
    });
}

// 要下载的文件列表
const files = [
    {
        url: 'https://unpkg.zhimg.com/marked@9.1.5/marked.min.js',
        dest: path.join(VENDOR_DIR, 'marked.min.js')
    },
    {
        url: 'https://unpkg.zhimg.com/@highlightjs/cdn-assets@11.8.0/highlight.min.js',
        dest: path.join(HIGHLIGHT_DIR, 'highlight.min.js')
    },
    {
        url: 'https://unpkg.zhimg.com/@highlightjs/cdn-assets@11.8.0/styles/github.min.css',
        dest: path.join(STYLES_DIR, 'github.min.css')
    },
    {
        url: 'https://unpkg.zhimg.com/@highlightjs/cdn-assets@11.8.0/styles/github-dark.min.css',
        dest: path.join(STYLES_DIR, 'github-dark.min.css')
    }
];

// 要下载的语言包列表
const languages = [
    'javascript', 'python', 'java', 'go', 'cpp', 'css', 
    'html', 'json', 'markdown', 'sql', 'typescript', 
    'yaml', 'bash'
];

async function main() {
    try {
        console.log('创建目录...');
        await createDirs();
        
        console.log('下载核心文件...');
        await Promise.all(files.map(file => {
            console.log(`下载 ${path.basename(file.dest)}...`);
            return downloadFile(file.url, file.dest);
        }));
        
        console.log('下载语言包...');
        await Promise.all(languages.map(lang => {
            const url = `https://unpkg.zhimg.com/@highlightjs/cdn-assets@11.8.0/languages/${lang}.min.js`;
            const dest = path.join(LANGUAGES_DIR, `${lang}.min.js`);
            console.log(`下载 ${lang}.min.js...`);
            return downloadFile(url, dest);
        }));
        
        // 修改字体下载URL为国内源
        const fontBaseUrl = 'https://fonts.font.im/s/inter/v12';
        console.log('下载字体文件...');
        await Promise.all([
            downloadFile(`${fontBaseUrl}/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2`, 
                        path.join(VENDOR_DIR, 'fonts', 'inter-400.woff2')),
            downloadFile(`${fontBaseUrl}/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hiA.woff2`,
                        path.join(VENDOR_DIR, 'fonts', 'inter-500.woff2')),
            downloadFile(`${fontBaseUrl}/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiA.woff2`,
                        path.join(VENDOR_DIR, 'fonts', 'inter-600.woff2'))
        ]);
        
        console.log('所有文件下载完成！');
    } catch (error) {
        console.error('下载过程中出错:', error);
        process.exit(1);
    }
}

main(); 