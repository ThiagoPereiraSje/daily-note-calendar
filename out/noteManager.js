"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoteManager = void 0;
const vscode = require("vscode");
const path = require("path");
const dates_1 = require("./dates");
class NoteManager {
    constructor() {
        this._creatingNotes = new Set();
    }
    cfg() {
        return vscode.workspace.getConfiguration('dailyNoteCalendar');
    }
    root() {
        return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    }
    async showDocument(uri, doc) {
        if (path.extname(uri.fsPath) === '.md') {
            await vscode.commands.executeCommand('markdown.showPreview', uri);
        }
        else {
            await vscode.window.showTextDocument(doc);
        }
    }
    /** Full path for a daily note */
    getNotePath(date) {
        const r = this.root();
        if (!r) {
            return undefined;
        }
        const c = this.cfg();
        const name = (0, dates_1.formatDate)(date, c.get('dateFormat', 'YYYY-MM-DD'));
        const ext = c.get('noteExtension', '.md');
        const folder = c.get('notesFolder', 'daily-notes');
        return path.join(r, folder, name + ext);
    }
    /** Open or create a daily note */
    async openNote(date, beside = false) {
        const r = this.root();
        if (!r) {
            vscode.window.showErrorMessage('Open a folder first.');
            return;
        }
        const c = this.cfg();
        const ext = c.get('noteExtension', '.md');
        const folder = c.get('notesFolder', 'daily-notes');
        const fname = (0, dates_1.formatDate)(date, c.get('dateFormat', 'YYYY-MM-DD')) + ext;
        const newUri = vscode.Uri.file(path.join(r, folder, fname));
        try {
            await this.createNote(newUri, date);
        }
        catch (error) {
            throw error;
        }
    }
    async createNote(uri, date) {
        const key = uri.fsPath;
        if (this._creatingNotes.has(key)) {
            return;
        }
        this._creatingNotes.add(key);
        try {
            try {
                await vscode.workspace.fs.stat(uri);
                const doc = await vscode.workspace.openTextDocument(uri);
                await this.showDocument(uri, doc);
                return;
            }
            catch (error) {
                if (error?.code !== 'FileNotFound') {
                    throw error;
                }
            }
            const c = this.cfg();
            let content = '';
            // Try loading template
            const tplPath = c.get('templatePath', '');
            if (tplPath && this.root()) {
                try {
                    const curTime = new Date();
                    if (!(0, dates_1.sameDay)(date, curTime)) {
                        curTime.setHours(8, 0, 0, 0);
                    }
                    const tplUri = vscode.Uri.file(path.join(this.root(), tplPath));
                    const raw = await vscode.workspace.fs.readFile(tplUri);
                    content = Buffer.from(raw).toString('utf-8');
                    const dateStr = (0, dates_1.formatDate)(date, c.get('dateFormat', 'YYYY-MM-DD'));
                    content = content
                        .replace(/\{\{title\}\}/g, dateStr)
                        .replace(/\{\{date\}\}/g, (0, dates_1.formatDate)(date, 'YYYY-MM-DD'))
                        .replace(/\{\{time\}\}/g, (0, dates_1.formatDate)(curTime, 'HH:mm'));
                }
                catch {
                    // template not found
                }
            }
            if (!content) {
                content = '# ' + (0, dates_1.formatDate)(date, c.get('dateFormat', 'YYYY-MM-DD')) + '\n\n';
            }
            // Ensure directory exists
            try {
                await vscode.workspace.fs.createDirectory(vscode.Uri.file(path.dirname(uri.fsPath)));
            }
            catch { /* may already exist */ }
            try {
                await vscode.workspace.fs.stat(uri);
                const doc = await vscode.workspace.openTextDocument(uri);
                await this.showDocument(uri, doc);
                return;
            }
            catch (error) {
                if (error?.code !== 'FileNotFound') {
                    throw error;
                }
            }
            await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
            const doc = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(doc);
        }
        finally {
            this._creatingNotes.delete(key);
        }
    }
    /** Scan the notes folder (and subfolders) for a range of dates */
    async scanMonth(year, month) {
        const result = new Map();
        const r = this.root();
        if (!r) {
            return result;
        }
        const c = this.cfg();
        const folder = c.get('notesFolder', 'daily-notes');
        const ext = c.get('noteExtension', '.md');
        const dateFmt = c.get('dateFormat', 'YYYY-MM-DD');
        // Check dates from 7 days before month to 7 days after
        const start = new Date(year, month, -7);
        const end = new Date(year, month + 1, 7);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const fname = (0, dates_1.formatDate)(d, dateFmt) + ext;
            const noteUri = vscode.Uri.file(path.join(r, folder, fname));
            try {
                await vscode.workspace.fs.stat(noteUri);
            }
            catch {
                continue;
            }
            const iso = `${d.getFullYear()}-${(0, dates_1.pad2)(d.getMonth() + 1)}-${(0, dates_1.pad2)(d.getDate())}`;
            result.set(iso, { hasNote: true, wordCount: 0, hasOpenTasks: false });
        }
        return result;
    }
    /** Try to extract a date from the active editor's file name */
    getActiveDate() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return undefined;
        }
        const r = this.root();
        if (!r) {
            return undefined;
        }
        const c = this.cfg();
        const folder = c.get('notesFolder', 'daily-notes');
        const ext = c.get('noteExtension', '.md');
        const fp = editor.document.uri.fsPath;
        const dir = path.join(r, folder);
        if (!fp.startsWith(dir)) {
            return undefined;
        }
        const base = path.basename(fp, ext);
        const d = new Date(base + 'T12:00:00');
        return isNaN(d.getTime()) ? undefined : d;
    }
}
exports.NoteManager = NoteManager;
//# sourceMappingURL=noteManager.js.map