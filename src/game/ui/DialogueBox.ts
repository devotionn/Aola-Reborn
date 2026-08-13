import Phaser from 'phaser';

export class DialogueBox {
  private readonly container: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private index = 0;
  private closed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly speaker: string,
    private readonly pages: string[],
    private readonly onComplete?: () => void,
  ) {
    void this.scene;
    void this.speaker;
    this.container = scene.add.container(0, 0).setDepth(200);
    const shade = scene.add.rectangle(640, 360, 1280, 720, 0x050912, 0.2).setInteractive();
    const panel = scene.add.rectangle(640, 590, 1120, 190, 0x0b1433, 0.97)
      .setStrokeStyle(3, 0x7da8db)
      .setInteractive({ useHandCursor: true });
    const portrait = scene.add.circle(145, 590, 52, 0x31568a).setStrokeStyle(3, 0xb5ddff);
    const initial = scene.add.text(145, 590, speaker.slice(0, 1), {
      fontSize: '34px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);
    const name = scene.add.text(225, 518, speaker, {
      fontSize: '22px', fontStyle: 'bold', color: '#ffe59b',
    });
    this.body = scene.add.text(225, 555, '', {
      fontSize: '18px', color: '#eaf3ff', lineSpacing: 8, wordWrap: { width: 850 },
    });
    this.hint = scene.add.text(1120, 650, '', {
      fontSize: '13px', color: '#9fc4ef',
    }).setOrigin(1, 0.5);

    this.container.add([shade, panel, portrait, initial, name, this.body, this.hint]);
    panel.on('pointerdown', () => this.next());
    this.render();
  }

  next(): void {
    if (this.closed) return;
    if (this.index < this.pages.length - 1) {
      this.index += 1;
      this.render();
      return;
    }
    this.closed = true;
    this.container.destroy(true);
    this.onComplete?.();
  }

  destroy(): void {
    if (this.closed) return;
    this.closed = true;
    this.container.destroy(true);
  }

  private render(): void {
    this.body.setText(this.pages[this.index] ?? '……');
    this.hint.setText(this.index === this.pages.length - 1 ? 'E / 点击 · 完成' : 'E / 点击 · 下一句');
  }
}
