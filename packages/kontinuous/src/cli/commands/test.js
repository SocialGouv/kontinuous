const { Command, Option } = require("commander")

const test = require("~/test")

const options = require("../options")

module.exports = (program) => {
  program
    .command("test")
    .description("test against current repo snapshot")
    .addOption(options.cwd)
    .addOption(options.chart)
    .addOption(options.ignoreProjectTemplates)
    .addOption(options.env)
    .addOption(options.debug)
    .addOption(options.gitOrg)
    .option("--update, -u", "update snapshots")
    .action(async (_opts, command) => {
      const opts = command.optsWithGlobals()
      await test(opts)
    })

  const b64d = (str) => Buffer.from(str, "base64").toString()
  program.addCommand(
    new Command(b64d("YnVubnk="))
      .addOption(new Option(b64d("LS1ob2xl")).hideHelp())
      .action((opts) => {
        const s = opts[b64d("aG9sZQ==")]
          ? "ICAgICAgICAgICAgICAgICAgICAgIC98ICAgICAgX18KKiAgICAgICAgICAgICArICAgICAgLyB8ICAgLC1+IC8gICAgICAgICAgICAgKwogICAgIC4gICAgICAgICAgICAgIFkgOnwgIC8vICAvICAgICAgICAgICAgICAgIC4gICAgICAgICAqCiAgICAgICAgIC4gICAgICAgICAgfCBqaiAvKCAuXiAgICAgKgogICAgICAgICAgICAgICAqICAgID4tIn4iLXYiICAgICAgICAgICAgICAuICAgICAgICAqICAgICAgICAuCiogICAgICAgICAgICAgICAgICAvICAgICAgIFkKICAgLiAgICAgLiAgICAgICAgam8gIG8gICAgfCAgICAgLiAgICAgICAgICAgICsKICAgICAgICAgICAgICAgICAoIH5UfiAgICAgaiAgICAgICAgICAgICAgICAgICAgICsgICAgIC4KICAgICAgKyAgICAgICAgICAgPi5fLScgXy4vICAgICAgICAgKwogICAgICAgICAgICAgICAvfCA7LSJ+IF8gIGwKICAuICAgICAgICAgICAvIGwvICwtIn4gICAgXCAgICAgKwogICAgICAgICAgICAgIFwvL1wvICAgICAgLi0gXAogICAgICAgKyAgICAgICBZICAgICAgICAvICAgIFkKICAgICAgICAgICAgICAgbCAgICAgICBJICAgICAhCiAgICAgICAgICAgICAgIF1cICAgICAgX1wgICAgLyJcCiAgICAgICAgICAgICAgKCIgfi0tLS0oIH4gICBZLiAgKQogICAgICAgICAgfn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn4KCllvdSBmb2xsb3dlZCBtZSBkb3duIHRoZSByYWJiaXQgaG9sZSwKYnV0LCBzZXJpb3VzbHksIHlvdSBkb24ndCBoYXZlIGJldHRlciB0aGluZ3MgdG8gZG8gPwo="
          : "ICDioIDioIDioIDioIDioIDioIDiooHio7Tio7bio7bio6Tio4DioIDioIDioIDioInioKLioYDioIDioIDioIDioIDioIDioIDioIDioIDioJLio6Dio7bio7bio7bio6bio4DioIDioIDioIDioIDioIDioIDioIDioIDioIAKICDioIDioIDioIDioIDiooDioZzio73io4Pio7/io7/io7/io7/io7/io6bioYDioIDioIDioIjioIDioIDioIDioIDioIDioIDioIDiooDio77io7/io7/io7/io7/ioIjiorvio6bioIDioKDioYDioIDioIDioIDioIDioIAKICDioIDioIDioIDio7DioIvio7DioIfio7jioZ/ioJniorvio7/io7/io7/io7/io6bioYDioIDioIDioIDioIDioIDioIDioIDioqDio7/io7/io7/io7/io7/io7/ioIDiooDio7/io7fioYDioJjioobioIDioIDioIDioIAKICDioIDioIDio7DioIPio7TioY/iooDio7/ioIHioIDioIDioJnior/io7/io7/io7/io7fio4TioIDioIDioIDioIDioIDioqDio7/io7/io7/io7/iob/ioIviorjioYfioIDio7/io7/io7fioYDioIDioLPioYDioIDioIAKICDioIDioqDioI/io7Tiob/ioIDio77ioY/ioIDioIDioIDioIDioIDioJnior/io7/io7/io7/io7fio6Tio6Tio6Tio6Tio77io7/io7/io7/ioIvioIDioIDioIjio4fioIDioJjio7/io7/io7fioYDioIDioLnioYTioIAKICDioIDio7/ioI/iorjio5fio7ziob/ioIDioIDioIDioIDioIDioIDioIDio6Dio7/io7/io7/io7/io7/io7/io7/io7/io7/io6/io7vio7fio4TioIDioIDioIDiornioYDioIDioLvio7/io7/io7fioYDioIDioLjioYAKICDiorjioIfio7bio77io7/io7/ioIPioIDioIDioIDioIDioIDio6Tio7zio5/ioovioazio73ioZ/io5/ioZvior/ior/ioZvioLviob/ioL/io7/io6bioIDioIDioIjio6fioIDioIDiorvio7/io7/io7/ioYTioIDioocKICDio7/io7bio77io7/io7/ioIPioIDioIDioIDioIDiooDio57ioZ/io6/io7Tio77io7/ioIPio7fio7/io7/io7/io7/io7/io7/io7/io7/io7/io7/io7fioIDioIDioLjio4fioIDioonio73io7/io7/io7/ioYTioIgKICDio7/io7/io7/io7/ioY/ioIDioIDioIDioIDioIDiobzio57io77ior/io7/io7/ioY/ioIDio7/io7/ioYvioLvio7/iorvio7/io7/io7/io7/io7/io7/ioYfioIDiooDioZnio4bioIDioKDio77io7/io7/io7fioIAKICDioLnioL/ioL/ioIvioIDioIDioIDioIDioIDiorDiob/io7nioY/iob/io73iob/ioIDioIDioIjioJvioIPioIDioLjioIDioJvioL/io7/io7/io7/io7/io7/ioYDioIDioIDioJjioLfio4Tio6jio7/io7/ioJ/ioIAKICDioIDioIDioIDioIDioIDioIDioIDioIDioIDio7fioIPio7/io7/io4fio7/io6Hio7Tio7bioIDioIDioIDioIDioJrio7/io7/ioJ/ior7ioY/ior/io7/io7/io7/ioIDioIDioIDioIDioIDioInioInioIHioIDioIAKICDioIDioIDioIDioIDioIDioIDioIDioIDioIDior/ioIDiob/io7/io7/io7/ioIHioJvioJvioIDioIDioIDioIDioIDioIDioIHioqDio7/io7/io7/io7/io7/io7/ioIDioIDioIDioIDioIDioIDioIDioIDioIDioIAKICDioIDioIDioIDioIDioIDioIDioIDioIDioIDioLjioYTioIDio7/io7/io7/io4/ioIDioIDioIDioIDioIDioIDioIDioIDioIDio6Pior/io6/ior7io7/iob/io7/ioYDioIDioIDioIDioIDioIDioIDioIDioIDioIAKICDioIDioIDioIDioIDioIDioIDioIDioIDioIDioIDioJnioqDior/io7/io7/io77ioYDioIDioIDioIDioIDioIDioIDioIDioIDio6Diob/io7/io77io7/io7/io7/ioYfioIDioIDioIDioIDioIDioIDioIDioIDioIAKICDioIDioIDioIDioIDioIDioIDioIDioIDioIDioIDioIDiorjio77ioJjio7/io7/io7/io6bio4Tio4DioIDioIDio4DiobTioJ7io7/io4Hio7/io7/io7/io7/io7/io7/ioYTioIDioIDioIDioIDioIDioIDioIDioIAKICDioIDioIDioIDioIDioIDioIDioIDioIDioIDioIDioIDio7/io7/io6zio7/io7/io7/io7/io7/io7/ioZvioIvioIHioIDioIDio7/io7/io7/io7/io7/io7/io7/io7/io7/ioYDioIDioIDioIDioIDioIDioIDioIAKICDioIDioIDioIDioIDioIDioIDioIDioIDioIDioIDioIDioZ7io7/io7/io7/ioL/ior/ior/ioJviooXioIjioLPioKTio4DioYDioL7io7/ioZvioJvioJvioLvioL/io7/io7/io7fioYDioIDioIDioIDioIDioIDioIAKICDioIDioIDioIDioIDioIDioIDioIDioIDioIDioIDio7jio4fioZ/ioInioIDioIDioIjioo/io4bioKDioLfioYDiorDio77io73io7fio7/io7/ioJbioIDioIDioIDioIjiorvio7fioqPioIDioIDioIDioIDioIDioIAKICDioIDioIDioIDioIDioIDioIDioIDioIDioIDiooDio6/io7/ioIHioIDioIDioIDioIDioIjioLjioYTioIDioIjioIDiorvioY/ioIDioI/ioIvioIDioIDioIDioIDioIDioIjio7/io6/ioofioIDioIDioIDioIDioIAKICDioIDioIDioIDioIDioIDioIDioIDioIDioIDio7zio7/io7/ioIDioIDioIDioIDioIDioqDioYDioIDioIDioIDioIDioIDioIDioIDioIDioIDioIDioIDioIDioIDioqbioYDio7/io7/io77ioYTioIDioIDioIDioIAKICDioIDioIDioIDioIDioIDioIDioIDioIDio7Diob/io7/io7/ioIDioIDioIDioIDioIDiorDioIHioIDioIDioYDioIDioIDioIDioIDiooTioIDioIDioIDioIDioIDioIDioojio7zio7/ioZzio7fioIDioIDioIDioIAKICDioIDioIDioIDioIDioIDioIDioIDioIDio7/ioYfio7/io7/ioYDioIDioIDioIDioIDioJjioIDiooDiobTiorvioJPioqTioYDioIDioIDioLPioYDioIDioIDiooDio7Tio4vioIjio7/io7/ioLnioYfioIDioIDioIAKICDioIDioIDioIDioIDioIDioIDioIDiorjiob/io7/io7/ioLvioYfioIDioIDioIDioIDioIDioIDio7zioIDioJvio4fioIDioInioLPio6bioYDiooPioIDio7DioZ/ioIPioIDioIDio7zio7/io6fio7fioIDioIDioIAKICDioIDioIDioIDioIDioIDioIDioIDiorjioIPiorvioY/iorjio7fioIDioIDioIDioIDioIDio7jioYfioIDioIDioJjioIDioIDioIDio7bio7/io7bio7Tio7/io6Tio6Tio7Tio77io7/io7/ioZ/io7/ioYDioIDioIAKICDioIDioIDioIDioIDioIDioIDioIDioJjioYbioLjio6fio7ziornioYbioIDioIDioIDioIDio7/io7/io6bio6Tio7jio6bio7Tio7/io7/io7/io7/io7/io7/io7/io7/io7/io7/io7/io7/ioYfiornioYfioIDioIAKICDioIDioIDioIDioIDioIDioIDioIDioLDioIPioIDiorvioY/io7zio7fioIDioIDioIDioIDiorvio7/io7/io7/io7/io7/io7/io7/io7/io7/io7/io7/io7/io7/io7/io7/iob/ior/io7/ioYfioJjioYfioIDioIAKICDioIDioIDioIDioIDioIDioIDioIDioILioIDioIDiorDio7/io7/io7/io4fioIDioIDioIDiorjio7/io7/io7/io7/io7/io7/io7/io7/io7/io7/io7/io7/io7/ioqDiob/io6fio7/io7nioYfioIDioYfioIDioIAKICDioIDioIDioIDioIDioIDioIDioIDioIDioIDio7Dio6/iob7ioqPio7/io7/ioYDioIDioIDiorjio7/io7/io7/io7/io7/io7/io7/io7/io7/io7/io7/io7/ioIfiorjioYfio7/ioIfio7/ioIHioIDioIDioIDioIAKICDioIDioIDioIDioIDioIDioIDiooDio6DioL7ioJvioIHioqDiob/iob/io7/ioIfioIDioIDioLjio7/io7/io7/io7/io7/io7/io7/io7/io7/io7/io7/ioIPioIDioIjioYfioIvioIDioa/io4DioIDioIDioIDioIAKICDioIDioIDioIDioIDioIDioIDioIjioYbioIDioIDioJTioIvio7zio7/io7/ioIDioIDioIDioIDio7/io7/io7/io7/io7/io7/io7/io7/io7/iob/ioIHioIDioIDioIDioYfioIDioIDioIDioIDioIHioIDioIDioIAKICDioIDioIDioIDioIDioIDioIDioIDioIHiooDio6DiobTio7vio7/io7/io7/ioYbioIDioIDioIDiornio7/io7/io7/io7/io7/io7/io7/iob/ioIHioYfioIDioIDioIDioYfioIDioIDioIDioIDioIDioIDioIDioIAKICDioIDioIDioIDioIDioIDioIDio6DioJbioIvioInioInioJnior/io7/io7/ioYfioIDioIDioIDiorjio7/io7/io7/io7/io7/io7/iob/ioIHioIDiorDioIDioIDioIDioYfioIDioIDioIDioIDioIDioIDioIDioIAKICDioIDioIDioIDioIDioaTioIrioIDioIDioIDioKDioIDioIDioIjiorvio7/io7/ioIDioIDioIDioLjio7/io7/io7/io7/io5/io77ioLfio4TioIDiorjioIDioIDioIDioYfioIDioIDioIDioIDioIDioIDioIDioIAKICDioIDioIDioaDioIrioYDioIDioIDioKDioIjioIDioIDioIDioIDioIjio7/io7/ioYbioIDioIDioIDio7/io7/io7/io7/ioJ/ioIHioIDioJnioYbioIDioYfioIDioKDioIHioIDioIDioIDioIDioIDioIDioIDioIAKCiAgICBfX19fX19fXyAgICAgICAgX18gICAgICAgICAuX18gICAgICAgICAgICAgLl8uCiAgIC8gIF9fX19fLyAgX19fX18vICB8XyAgX19fXyB8ICB8X18gX19fX18gICAgfCB8CiAgLyAgIFwgIF9fXyAvICBfIFwgICBfX1wvIF9fX1x8ICB8ICBcXF9fICBcICAgfCB8CiAgXCAgICBcX1wgICggIDxfPiApICB8IFwgIFxfX198ICAgWSAgXC8gX18gXF8gIFx8CiAgIFxfX19fX18gIC9cX19fXy98X198ICBcX19fICA+X19ffCAgKF9fX18gIC8gIF9fCiAgICAgICAgICBcLyAgICAgICAgICAgICAgICAgXC8gICAgIFwvICAgICBcLyAgIFwvCgogICBZb3UgaGF2ZSBiZWVuIGhhY2tlZCAhIE5vLCBJJ20gam9raW5nICEKICAgQnV0IHNlcmlvdXNseSwgYmUgY2FyZWZ1bCB3aGVuIHlvdSBydW4gcmFuZG9tIHRoaW5ncyBmcm9tIGludGVybmV0IDotKQo="
        console.log(b64d(s))
      }),
    { [b64d("aGlkZGVu")]: true }
  )
}
